import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Typography,
  Box,
} from '@mui/material';
import axios from 'axios';
import { URLS } from '../../constants/urls';
import {
  aspectKeyFromAspectTypeName,
  getPlainAspectData,
  isSystemAspectKey,
} from '../../constants/stewardEdit';

export type AspectEditMode = 'edit' | 'add';

interface AspectTypeOption {
  name: string;
  displayName: string;
}

interface AspectEditDialogProps {
  open: boolean;
  mode: AspectEditMode;
  entry: any;
  aspectKey?: string;
  idToken: string;
  aspectTypeOptions?: AspectTypeOption[];
  onClose: () => void;
  onSave: (payload: {
    aspectKey: string;
    aspectType: string;
    data: Record<string, unknown>;
  }) => Promise<void> | void;
  saving?: boolean;
}

const AspectEditDialog: React.FC<AspectEditDialogProps> = ({
  open,
  mode,
  entry,
  aspectKey,
  idToken,
  aspectTypeOptions = [],
  onClose,
  onSave,
  saving = false,
}) => {
  const [selectedTypeName, setSelectedTypeName] = useState('');
  const [fieldDefs, setFieldDefs] = useState<{ name: string; type?: string; index?: number }[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [jsonFallback, setJsonFallback] = useState('');
  const [useJson, setUseJson] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingAspect = aspectKey ? entry?.aspects?.[aspectKey] : null;

  const resolvedAspectType = useMemo(() => {
    if (mode === 'edit' && existingAspect?.aspectType) {
      return existingAspect.aspectType;
    }
    return selectedTypeName;
  }, [mode, existingAspect, selectedTypeName]);

  const resolvedAspectKey = useMemo(() => {
    if (mode === 'edit' && aspectKey) return aspectKey;
    if (selectedTypeName) return aspectKeyFromAspectTypeName(selectedTypeName);
    return '';
  }, [mode, aspectKey, selectedTypeName]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setUseJson(false);

    if (mode === 'edit' && existingAspect) {
      const plain = getPlainAspectData(existingAspect);
      const entries = Object.entries(plain || {});
      const hasComplex = entries.some(
        ([, v]) => v !== null && typeof v === 'object'
      );
      if (hasComplex || entries.length === 0) {
        setUseJson(true);
        setJsonFallback(JSON.stringify(plain || {}, null, 2));
        setFieldDefs([]);
        setValues({});
      } else {
        setFieldDefs(entries.map(([name]) => ({ name, type: typeof plain[name] })));
        const next: Record<string, string> = {};
        for (const [k, v] of entries) {
          next[k] = v === null || v === undefined ? '' : String(v);
        }
        setValues(next);
        setJsonFallback('');
      }
      setSelectedTypeName(existingAspect.aspectType || '');
    } else {
      setSelectedTypeName('');
      setFieldDefs([]);
      setValues({});
      setJsonFallback('{}');
      setUseJson(false);
    }
  }, [open, mode, existingAspect]);

  useEffect(() => {
    if (!open || !resolvedAspectType || mode !== 'add') return;

    let cancelled = false;
    const load = async () => {
      setLoadingSchema(true);
      setError(null);
      try {
        axios.defaults.headers.common['Authorization'] = idToken ? `Bearer ${idToken}` : '';
        const response = await axios.post(URLS.API_URL + URLS.GET_ASPECT_DETAIL, {
          name: resolvedAspectType,
        });
        if (cancelled) return;
        const recordFields = response.data?.metadataTemplate?.recordFields || [];
        if (recordFields.length === 0) {
          setUseJson(true);
          setFieldDefs([]);
          setJsonFallback('{}');
        } else {
          setUseJson(false);
          setFieldDefs(
            recordFields.map((f: any) => ({
              name: f.name || f.index?.toString() || 'field',
              type: f.type || 'string',
              index: f.index,
            }))
          );
          const next: Record<string, string> = {};
          for (const f of recordFields) {
            const name = f.name || 'field';
            next[name] = '';
          }
          setValues(next);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.error || err?.message || 'Failed to load aspect type schema');
          setUseJson(true);
          setJsonFallback('{}');
        }
      } finally {
        if (!cancelled) setLoadingSchema(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, resolvedAspectType, mode, idToken]);

  const selectableTypes = useMemo(
    () =>
      aspectTypeOptions.filter((opt) => {
        const key = aspectKeyFromAspectTypeName(opt.name);
        return !isSystemAspectKey(key, { aspectType: opt.name });
      }),
    [aspectTypeOptions]
  );

  const coerceValue = (raw: string, typeHint?: string): unknown => {
    const trimmed = raw.trim();
    if (typeHint === 'bool' || typeHint === 'boolean') {
      return trimmed.toLowerCase() === 'true';
    }
    if (typeHint === 'number' || typeHint === 'double' || typeHint === 'int' || typeHint === 'integer') {
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : trimmed;
    }
    if (trimmed === 'true' || trimmed === 'false') return trimmed === 'true';
    if (trimmed !== '' && !Number.isNaN(Number(trimmed)) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
    return raw;
  };

  const handleSave = async () => {
    setError(null);
    if (!resolvedAspectKey || !resolvedAspectType) {
      setError('Aspect type is required');
      return;
    }
    if (isSystemAspectKey(resolvedAspectKey, existingAspect)) {
      setError('System-managed aspects cannot be edited. Use a customer-defined aspect type.');
      return;
    }

    let data: Record<string, unknown> = {};
    if (useJson) {
      try {
        const parsed = JSON.parse(jsonFallback || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          setError('Aspect data must be a JSON object');
          return;
        }
        data = parsed;
      } catch {
        setError('Invalid JSON');
        return;
      }
    } else {
      for (const field of fieldDefs) {
        data[field.name] = coerceValue(values[field.name] ?? '', field.type);
      }
    }

    await onSave({
      aspectKey: resolvedAspectKey,
      aspectType: resolvedAspectType,
      data,
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontFamily: '"Google Sans", sans-serif' }}>
        {mode === 'add' ? 'Add aspect' : 'Edit aspect'}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        {mode === 'add' && (
          <TextField
            select
            label="Aspect type"
            value={selectedTypeName}
            onChange={(e) => setSelectedTypeName(e.target.value)}
            fullWidth
            size="small"
            disabled={saving}
          >
            {selectableTypes.length === 0 ? (
              <MenuItem value="" disabled>
                No aspect types available
              </MenuItem>
            ) : (
              selectableTypes.map((opt) => (
                <MenuItem key={opt.name} value={opt.name}>
                  {opt.displayName}
                </MenuItem>
              ))
            )}
          </TextField>
        )}

        {mode === 'edit' && (
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Google Sans", sans-serif' }}>
            {resolvedAspectKey}
          </Typography>
        )}

        {loadingSchema ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : useJson ? (
          <TextField
            label="Aspect data (JSON)"
            value={jsonFallback}
            onChange={(e) => setJsonFallback(e.target.value)}
            fullWidth
            multiline
            minRows={8}
            disabled={saving}
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: 13 } }}
          />
        ) : (
          fieldDefs.map((field) => (
            <TextField
              key={field.name}
              label={field.name}
              value={values[field.name] ?? ''}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
              }
              fullWidth
              size="small"
              disabled={saving}
            />
          ))
        )}

        {!useJson && fieldDefs.length > 0 && (
          <Button size="small" onClick={() => {
            const plain: Record<string, unknown> = {};
            for (const field of fieldDefs) {
              plain[field.name] = coerceValue(values[field.name] ?? '', field.type);
            }
            setJsonFallback(JSON.stringify(plain, null, 2));
            setUseJson(true);
          }}>
            Edit as JSON
          </Button>
        )}

        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loadingSchema || (mode === 'add' && !selectedTypeName)}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AspectEditDialog;
