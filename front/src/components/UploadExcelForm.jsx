import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Alert, 
  Tabs, 
  Tab, 
  Card, 
  CardContent, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import FolderIcon from '@mui/icons-material/Folder';
import StorageIcon from '@mui/icons-material/Storage';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const UploadTab = React.memo(function UploadTab({ source, setSource, files, setFiles, handleSubmit, loading }) {
  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };
  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }}>
      <TextField
        label="Источник"
        value={source}
        onChange={e => setSource(e.target.value)}
        fullWidth
        sx={{ mb: 2, maxWidth: 400 }}
        placeholder="Введите источник файла (необязательно)"
      />
      <Button
        variant="outlined"
        component="label"
        sx={{ mb: 2, borderRadius: 2, fontWeight: 600, fontSize: 16 }}
      >
        Выбрать Excel-файл(ы)
        <input
          type="file"
          accept=".xlsx,.xls"
          multiple
          hidden
          onChange={handleFileChange}
        />
      </Button>
      <Box sx={{ mb: 2, minHeight: 24 }}>
        {files.length > 0 && (
          <Typography variant="body2" color="primary">
            {files.map(f => f.name).join(', ')}
          </Typography>
        )}
      </Box>
      <Button
        type="submit"
        variant="contained"
        disabled={loading}
        sx={{ borderRadius: 2, fontWeight: 700, fontSize: 18, px: 4, py: 1 }}
      >
        {loading ? 'Загрузка...' : 'Загрузить'}
      </Button>
    </Box>
  );
});

const FilesTab = React.memo(function FilesTab({ crmFiles, filesLoading, fetchFiles, setDeleteDialog, setResetDialog, onDelete }) {
  const FileCard = React.useCallback(({ file, type, onDelete }) => (
    <Card sx={{ 
      mb: 2, 
      background: 'linear-gradient(135deg, #f8fbff 0%, #e3f2fd 100%)',
      border: '1px solid #e3f2fd',
      borderRadius: 3,
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
      }
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <FolderIcon sx={{ color: '#1976d2', mr: 1 }} />
              <Typography variant="h6" fontWeight={600} color="#1976d2">
                {file.filename}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                label={`${file.count} записей`} 
                color="primary" 
                variant="outlined" 
                size="small"
              />
              <Chip 
                label={`Источник: ${file.source}`} 
                color="secondary" 
                variant="outlined" 
                size="small"
              />
              <Chip 
                label="CRM 2018-2024" 
                color="info" 
                variant="outlined" 
                size="small"
              />
            </Box>
          </Box>
          <IconButton 
            onClick={() => onDelete(file, 'crm')}
            sx={{ 
              color: '#f44336',
              '&:hover': { 
                background: 'rgba(244, 67, 54, 0.1)',
                transform: 'scale(1.1)'
              }
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  ), []);

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h6" fontWeight={600} color="#1976d2">
          <FolderIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Загруженные файлы
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchFiles}
          variant="outlined"
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          Обновить
        </Button>
      </Box>
      {filesLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600} color="#1976d2">
              <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              CRM 2018-2024
            </Typography>
            {crmFiles.length > 0 && (
              <Button
                startIcon={<WarningIcon />}
                onClick={() => setResetDialog({ open: true, type: 'crm' })}
                variant="outlined"
                color="error"
                size="small"
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                Сбросить все
              </Button>
            )}
          </Box>
          {crmFiles.length === 0 ? (
            <Card sx={{ p: 3, textAlign: 'center', background: '#fafafa' }}>
              <Typography color="text.secondary">
                Нет загруженных файлов CRM 2018-2024
              </Typography>
            </Card>
          ) : (
            crmFiles.map((file, index) => (
              <FileCard 
                key={index} 
                file={file} 
                type="crm" 
                onDelete={onDelete}
              />
            ))
          )}
        </Box>
      )}
    </Box>
  );
});

function UploadExcelForm() {
  // Состояние для загрузки файлов
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [source, setSource] = useState('');

  // Состояние для управления файлами
  const [crmFiles, setCrmFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, file: null, type: null });
  const [resetDialog, setResetDialog] = useState({ open: false, type: null });

  // Состояние для вкладок
  const [activeTab, setActiveTab] = useState(0);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setSuccess('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    if (!files.length) {
      setError('Выберите хотя бы один файл Excel.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      if (source.trim()) {
        formData.append('source', source);
      }
      const res = await fetch(`${API_BASE}/api/upload_excel`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Ошибка загрузки файла');
      }
      await res.json();
      setSuccess('Файл(ы) успешно загружены!');
      setFiles([]);
      setSource('');
      // Обновляем список файлов после загрузки
      fetchFiles();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    setFilesLoading(true);
    try {
      // Получаем список файлов CRM
      const crmResponse = await fetch(`${API_BASE}/api/list_uploaded_sources`);
      if (crmResponse.ok) {
        const crmData = await crmResponse.json();
        setCrmFiles(crmData);
      }
    } catch (err) {
      console.error('Ошибка загрузки списка файлов:', err);
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDeleteFile = async () => {
    const { file, type } = deleteDialog;
    try {
      let response;
      if (type === 'crm') {
        response = await fetch(`${API_BASE}/api/delete_by_source`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.filename })
        });
      } else {
        response = await fetch(`${API_BASE}/api/delete_by_istochnik`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.filename })
        });
      }

      if (response.ok) {
        setSuccess(`Файл "${file.filename}" успешно удален`);
        fetchFiles(); // Обновляем список
      } else {
        throw new Error('Ошибка удаления файла');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteDialog({ open: false, file: null, type: null });
    }
  };

  const handleResetAll = async () => {
    const { type } = resetDialog;
    try {
      let response;
      if (type === 'crm') {
        response = await fetch(`${API_BASE}/api/reset_all_crm`, {
          method: 'POST'
        });
      } else {
        response = await fetch(`${API_BASE}/api/reset_all_excel_2025`, {
          method: 'POST'
        });
      }

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Удалено ${result.deleted} записей из ${type === 'crm' ? 'CRM' : 'CRM 2025'}`);
        fetchFiles(); // Обновляем список
      } else {
        throw new Error('Ошибка сброса данных');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setResetDialog({ open: false, type: null });
    }
  };

  const handleDeleteClick = (file, type) => {
    setDeleteDialog({ open: true, file, type });
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Tabs 
        value={activeTab} 
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ 
          mb: 3,
          '& .MuiTab-root': {
            fontWeight: 600,
            fontSize: 16,
            textTransform: 'none'
          }
        }}
      >
        <Tab 
          label="Загрузить файлы" 
          icon={<UploadFileIcon />} 
          iconPosition="start"
        />
        <Tab 
          label="Управление файлами" 
          icon={<FolderIcon />} 
          iconPosition="start"
        />
      </Tabs>

      {activeTab === 0 && (
        <UploadTab 
          source={source}
          setSource={setSource}
          files={files}
          setFiles={setFiles}
          handleSubmit={handleSubmit}
          loading={loading}
        />
      )}
      {activeTab === 1 && (
        <FilesTab 
          crmFiles={crmFiles}
          filesLoading={filesLoading}
          fetchFiles={fetchFiles}
          setDeleteDialog={setDeleteDialog}
          setResetDialog={setResetDialog}
          onDelete={handleDeleteClick}
        />
      )}

      {success && <Alert severity="success" sx={{ mt: 3 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, file: null, type: null })}>
        <DialogTitle sx={{ color: '#f44336' }}>
          <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Подтверждение удаления
        </DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить файл "{deleteDialog.file?.filename || deleteDialog.file?.source}"?
            <br />
            <strong>Это действие нельзя отменить!</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, file: null, type: null })}>
            Отмена
          </Button>
          <Button onClick={handleDeleteFile} color="error" variant="contained">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialog.open} onClose={() => setResetDialog({ open: false, type: null })}>
        <DialogTitle sx={{ color: '#f44336' }}>
          <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Подтверждение сброса
        </DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите сбросить все данные {resetDialog.type === 'crm' ? 'CRM' : 'CRM 2025'}?
            <br />
            <strong>Это действие нельзя отменить!</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog({ open: false, type: null })}>
            Отмена
          </Button>
          <Button onClick={handleResetAll} color="error" variant="contained">
            Сбросить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UploadExcelForm; 