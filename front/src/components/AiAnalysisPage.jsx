import React, { useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, Alert, Grid, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Fade, Zoom, Grow, Tabs, Tab, Chip } from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RemoveIcon from '@mui/icons-material/Remove';


const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const VERSION = Date.now(); // Добавляем версию для принудительного обновления кэша

const endpoints = [
  {
    label: 'Анализировать CRM 2018-2024',
    endpoint: `${API_URL}/ai/analyze_crm_only`,
    icon: <AnalyticsIcon sx={{ mr: 1 }} />,
    key: 'crm',
    color: '#2196F3',
    gradient: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)',
  },
  {
    label: 'Анализировать CRM 2025',
    endpoint: `${API_URL}/ai/analyze_excel_2025_only`,
    icon: <BarChartIcon sx={{ mr: 1 }} />,
    key: 'excel2025',
    color: '#FF6B6B',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
  },
  {
    label: 'Сравнить периоды',
    endpoint: `${API_URL}/ai/compare_periods`,
    icon: <AssessmentIcon sx={{ mr: 1 }} />,
    key: 'comparison',
    color: '#9C27B0',
    gradient: 'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
  },
];



const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  if (typeof num !== 'number') return num.toString();
  
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('ru-RU');
};

function MetricsCards({ stats }) {
  if (!stats) return null;

  const metrics = [
    {
      title: 'Общее количество',
      value: stats.total_entries || stats.total_count || 0,
      icon: <TrendingUpIcon />,
      color: '#2196F3',
      gradient: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)',
    },
    {
      title: 'Общая сумма',
      value: stats.total_donations || stats.total_sum || 0,
      icon: <TrendingUpIcon />,
      color: '#4CAF50',
      gradient: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
    },
    {
      title: 'Средний донат',
      value: stats.avg_donation || stats.total_mean || 0,
      icon: <TrendingUpIcon />,
      color: '#FF9800',
      gradient: 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)',
    },
    {
      title: 'Максимальный донат',
      value: stats.max_donation || stats.total_max || 0,
      icon: <TrendingUpIcon />,
      color: '#F44336',
      gradient: 'linear-gradient(135deg, #F44336 0%, #EF5350 100%)',
    },
    {
      title: 'Минимальный донат',
      value: stats.min_donation || 0,
      icon: <TrendingDownIcon />,
      color: '#9C27B0',
      gradient: 'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
    },
    {
      title: 'Количество донатов',
      value: stats.donation_count || 0,
      icon: <AnalyticsIcon />,
      color: '#00BCD4',
      gradient: 'linear-gradient(135deg, #00BCD4 0%, #4DD0E1 100%)',
    },
    {
      title: 'Топ месяц (сумма)',
      value: stats.top_month_by_sum || '-',
      icon: <BarChartIcon />,
      color: '#FF5722',
      gradient: 'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)',
    },
    {
      title: 'Топ месяц (количество)',
      value: stats.top_month_by_count || '-',
      icon: <BarChartIcon />,
      color: '#795548',
      gradient: 'linear-gradient(135deg, #795548 0%, #A1887F 100%)',
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {metrics.map((metric, index) => (
        <Grid item xs={12} sm={6} lg={3} key={index}>
          <Grow in={true} timeout={300 + index * 100}>
            <Card sx={{ 
              background: metric.gradient,
              color: 'white',
              height: '100%',
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }
            }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ 
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 1,
                    p: 0.5,
                    mr: 1.5
                  }}>
                    {React.cloneElement(metric.icon, { 
                      sx: { fontSize: 20, color: 'white' } 
                    })}
                  </Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, fontSize: '0.85rem' }}>
                    {metric.title}
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700, 
                  mb: 0.5,
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {typeof metric.value === 'number' ? formatNumber(metric.value) : metric.value}
                </Typography>

              </CardContent>
            </Card>
          </Grow>
        </Grid>
      ))}
    </Grid>
  );
}

function ComparisonMetricsCards({ comparisonData }) {
  if (!comparisonData || !comparisonData.comparison_metrics) return null;

  const { comparison_metrics, changes } = comparisonData;
  
  const metrics = [
    {
      title: 'Общее количество',
      oldValue: comparison_metrics.crm_2018_2024.total_entries,
      newValue: comparison_metrics.crm_2025.total_entries,
      change: changes.total_entries,
      icon: <TrendingUpIcon />,
      color: '#2196F3',
      unit: 'записей',
    },
    {
      title: 'Общая сумма',
      oldValue: comparison_metrics.crm_2018_2024.total_donations,
      newValue: comparison_metrics.crm_2025.total_donations,
      change: changes.total_donations,
      icon: <TrendingUpIcon />,
      color: '#4CAF50',
      unit: '₸',
    },
    {
      title: 'Средний донат',
      oldValue: comparison_metrics.crm_2018_2024.avg_donation,
      newValue: comparison_metrics.crm_2025.avg_donation,
      change: changes.avg_donation,
      icon: <TrendingUpIcon />,
      color: '#FF9800',
      unit: '₸',
    },
    {
      title: 'Максимальный донат',
      oldValue: comparison_metrics.crm_2018_2024.max_donation,
      newValue: comparison_metrics.crm_2025.max_donation,
      change: changes.max_donation,
      icon: <TrendingUpIcon />,
      color: '#F44336',
      unit: '₸',
    },
    {
      title: 'Минимальный донат',
      oldValue: comparison_metrics.crm_2018_2024.min_donation,
      newValue: comparison_metrics.crm_2025.min_donation,
      change: changes.min_donation,
      icon: <TrendingDownIcon />,
      color: '#9C27B0',
      unit: '₸',
    },
    {
      title: 'Количество донатов',
      oldValue: comparison_metrics.crm_2018_2024.donation_count,
      newValue: comparison_metrics.crm_2025.donation_count,
      change: changes.donation_count,
      icon: <AnalyticsIcon />,
      color: '#00BCD4',
      unit: 'донатов',
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {metrics.map((metric, index) => {
        const isPositive = metric.change.percent_change > 0;
        const isNegative = metric.change.percent_change < 0;
        const isNeutral = metric.change.percent_change === 0;
        
        const changeColor = isPositive ? '#10B981' : isNegative ? '#EF4444' : '#6B7280';
        const changeBgColor = isPositive ? '#D1FAE5' : isNegative ? '#FEE2E2' : '#F3F4F6';
        const changeIcon = isPositive ? <TrendingUpIcon /> : isNegative ? <TrendingDownIcon /> : <RemoveIcon />;
        
        return (
          <Grid item xs={12} sm={6} lg={4} key={index}>
            <Grow in={true} timeout={300 + index * 100}>
              <Card sx={{ 
                height: '100%',
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
                border: `2px solid ${changeColor}20`,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px ${changeColor}30`,
                }
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ 
                        background: `${metric.color}20`,
                        borderRadius: 1,
                        p: 0.5,
                        mr: 1.5
                      }}>
                        {React.cloneElement(metric.icon, { 
                          sx: { fontSize: 20, color: metric.color } 
                        })}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem', color: '#374151' }}>
                        {metric.title}
                      </Typography>
                    </Box>
                    
                    {/* Индикатор изменения */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      background: changeBgColor,
                      borderRadius: 1,
                      px: 1,
                      py: 0.5
                    }}>
                      {React.cloneElement(changeIcon, { 
                        sx: { fontSize: 16, color: changeColor, mr: 0.5 } 
                      })}
                      <Typography variant="caption" sx={{ 
                        fontWeight: 600, 
                        color: changeColor,
                        fontSize: '0.75rem'
                      }}>
                        {metric.change.percent_change > 0 ? '+' : ''}{metric.change.percent_change}%
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Основные значения */}
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 700, 
                      color: '#1E293B', 
                      mb: 0.5,
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {formatNumber(metric.newValue)}
                      <Typography variant="body2" sx={{ 
                        ml: 0.5, 
                        color: '#64748B', 
                        fontWeight: 400 
                      }}>
                        {metric.unit}
                      </Typography>
                    </Typography>
                    
                    <Typography variant="body2" sx={{ 
                      color: '#64748B', 
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      было: {formatNumber(metric.oldValue)} {metric.unit}
                    </Typography>
                  </Box>
                  
                  {/* Визуальный индикатор изменения */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    background: '#F8FAFC',
                    borderRadius: 1,
                    p: 1,
                    border: '1px solid #E2E8F0'
                  }}>
                    <Typography variant="caption" sx={{ 
                      color: '#64748B',
                      fontSize: '0.7rem'
                    }}>
                      Изменение: {metric.change.absolute_change > 0 ? '+' : ''}{formatNumber(metric.change.absolute_change)} {metric.unit}
                    </Typography>
                    
                    <Box sx={{ 
                      width: 60, 
                      height: 4, 
                      background: '#E2E8F0', 
                      borderRadius: 2,
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${Math.min(Math.abs(metric.change.percent_change), 100)}%`,
                        background: changeColor,
                        borderRadius: 2
                      }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
        );
      })}
    </Grid>
  );
}

function getMonthBarData(monthStats) {
  if (!monthStats) return [];
  return Object.entries(monthStats).map(([month, data]) => ({
    month: month,
    value: typeof data === 'object' ? (data.count || 0) : data
  }));
}

function getSourceBarData(sourceStats) {
  if (!sourceStats) return [];
  return Object.entries(sourceStats).map(([source, count]) => ({
    source: source,
    value: count
  }));
}

function StatsTable({ title, stats }) {
  if (!stats) return null;
  
  // Создаем расширенную таблицу с месячной и годовой статистикой
  const tableData = [];
  
  // Основные статистики
  if (stats.total_entries) tableData.push({ key: 'Общее количество записей', value: stats.total_entries });
  if (stats.total_donations) tableData.push({ key: 'Общая сумма донатов', value: stats.total_donations });
  if (stats.avg_donation) tableData.push({ key: 'Средний донат', value: stats.avg_donation });
  if (stats.min_donation) tableData.push({ key: 'Минимальный донат', value: stats.min_donation });
  if (stats.max_donation) tableData.push({ key: 'Максимальный донат', value: stats.max_donation });
  if (stats.donation_count) tableData.push({ key: 'Количество донатов', value: stats.donation_count });
  
  // Топ месяцы
  if (stats.top_month_by_sum) tableData.push({ key: 'Топ месяц по сумме', value: stats.top_month_by_sum });
  if (stats.top_month_by_count) tableData.push({ key: 'Топ месяц по количеству', value: stats.top_month_by_count });
  if (stats.min_month_by_sum) tableData.push({ key: 'Минимальный месяц по сумме', value: stats.min_month_by_sum });
  if (stats.min_month_by_count) tableData.push({ key: 'Минимальный месяц по количеству', value: stats.min_month_by_count });
  
  if (tableData.length === 0) return null;
  
  return (
    <Card sx={{ 
      borderRadius: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      width: '100%'
    }}>
      <Box sx={{ 
        background: '#F8FAFC',
        p: 2,
        borderBottom: '1px solid #E2E8F0'
      }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 600, 
          color: '#1E293B',
          display: 'flex',
          alignItems: 'center',
          fontSize: '1rem'
        }}>
          <AssessmentIcon sx={{ mr: 1, color: '#2196F3', fontSize: 20 }} />
          {title}
        </Typography>
      </Box>
      <TableContainer>
        <Table>
                      <TableHead>
              <TableRow sx={{ background: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Показатель</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Значение</TableCell>
              </TableRow>
            </TableHead>
          <TableBody>
            {tableData.map((row, index) => (
              <TableRow key={index} sx={{ '&:hover': { background: '#F8FAFC' } }}>
                <TableCell sx={{ fontWeight: 500, color: '#374151', fontSize: '0.85rem' }}>
                  {row.key}
                </TableCell>
                <TableCell sx={{ color: '#64748B', fontSize: '0.85rem' }}>
                  {typeof row.value === 'number' ? formatNumber(row.value) : row.value}
                </TableCell>

              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}



function MonthTableCard({ title, data, type = "month" }) {
  if (!data || data.length === 0) return null;
  
  return (
    <Card sx={{ 
      height: '100%',
      borderRadius: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }
    }}>
      <CardContent sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ 
          mb: 2, 
          fontWeight: 600, 
          color: '#1E293B',
          display: 'flex',
          alignItems: 'center',
          fontSize: '1rem'
        }}>
          <AssessmentIcon sx={{ mr: 1, color: '#2196F3', fontSize: 20 }} />
          {title}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ background: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
                  {type === "month" ? "Месяц" : "Источник"}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Количество</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Процент</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, index) => {
                const total = data.reduce((sum, item) => sum + item.value, 0);
                const percentage = total > 0 ? ((row.value / total) * 100).toFixed(1) : 0;
                return (
                  <TableRow key={index} sx={{ '&:hover': { background: '#F8FAFC' } }}>
                    <TableCell sx={{ fontWeight: 500, color: '#374151', fontSize: '0.85rem' }}>
                      {type === "month" ? row.month : row.source}
                    </TableCell>
                    <TableCell sx={{ color: '#64748B', fontSize: '0.85rem' }}>
                      {formatNumber(row.value)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ 
                          width: 60, 
                          height: 8, 
                          background: '#E2E8F0', 
                          borderRadius: 4, 
                          mr: 1,
                          overflow: 'hidden'
                        }}>
                          <Box sx={{ 
                            width: `${percentage}%`, 
                            height: '100%', 
                            background: '#2196F3',
                            borderRadius: 4
                          }} />
                        </Box>
                        <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500, fontSize: '0.8rem' }}>
                          {percentage}%
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <Card sx={{ 
      textAlign: 'center', 
      py: 6,
      borderRadius: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      background: '#F8FAFC'
    }}>
      <CardContent>
        <Box sx={{ 
          color: '#64748B',
          mb: 2
        }}>
          {React.cloneElement(icon, { 
            sx: { 
              fontSize: 48, 
              opacity: 0.4,
              mb: 1.5
            } 
          })}
        </Box>
        <Typography variant="h5" sx={{ 
          mb: 1.5, 
          fontWeight: 600,
          color: '#374151'
        }}>
          {title}
        </Typography>
        <Typography variant="body1" sx={{ 
          opacity: 0.7,
          color: '#64748B'
        }}>
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}



export default function AiAnalysisPage() {
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState(() => {
    // Загружаем сохраненные результаты из localStorage
    const saved = localStorage.getItem('aiAnalysisResults');
    const savedTimestamp = localStorage.getItem('aiAnalysisTimestamp');
    
    // Проверяем, не устарели ли данные (больше 1 часа)
    if (saved && savedTimestamp) {
      const now = Date.now();
      const savedTime = parseInt(savedTimestamp);
      const oneHour = 60 * 60 * 1000; // 1 час в миллисекундах
      
      if (now - savedTime < oneHour) {
        return JSON.parse(saved);
      }
    }
    
    // Если данные устарели или их нет, очищаем localStorage
    localStorage.removeItem('aiAnalysisResults');
    localStorage.removeItem('aiAnalysisTimestamp');
    localStorage.removeItem('aiAnalysisActiveTab');
    return {};
  });
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    // Загружаем сохраненную активную вкладку
    const saved = localStorage.getItem('aiAnalysisActiveTab');
    const savedTimestamp = localStorage.getItem('aiAnalysisTimestamp');
    
    // Проверяем актуальность данных
    if (saved && savedTimestamp) {
      const now = Date.now();
      const savedTime = parseInt(savedTimestamp);
      const oneHour = 60 * 60 * 1000;
      
      if (now - savedTime < oneHour) {
        return parseInt(saved);
      }
    }
    
    return 0;
  });

  const handleAnalyze = async (key, url) => {
    console.log('handleAnalyze called with key:', key, 'url:', url);
    setLoading(prev => ({ ...prev, [key]: true }));
    setError('');
    try {
      const response = await fetch(url);
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error('Ошибка анализа');
      }
      const data = await response.json();
      console.log('Received data for', key, ':', data);
      const newResults = { ...results, [key]: data };
      console.log('New results:', newResults);
      setResults(newResults);
      // Сохраняем результаты в localStorage с timestamp
      localStorage.setItem('aiAnalysisResults', JSON.stringify(newResults));
      localStorage.setItem('aiAnalysisTimestamp', Date.now().toString());
    } catch (err) {
      console.error('Error in handleAnalyze:', err);
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleResetData = () => {
    setResults({});
    setActiveTab(0);
    setError('');
    // Очищаем localStorage
    localStorage.removeItem('aiAnalysisResults');
    localStorage.removeItem('aiAnalysisActiveTab');
    localStorage.removeItem('aiAnalysisTimestamp');
  };

  // Функция для проверки и очистки устаревших данных
  const checkAndClearStaleData = () => {
    const savedTimestamp = localStorage.getItem('aiAnalysisTimestamp');
    if (savedTimestamp) {
      const now = Date.now();
      const savedTime = parseInt(savedTimestamp);
      const oneHour = 60 * 60 * 1000;
      
      if (now - savedTime >= oneHour) {
        // Данные устарели, очищаем их
        localStorage.removeItem('aiAnalysisResults');
        localStorage.removeItem('aiAnalysisTimestamp');
        localStorage.removeItem('aiAnalysisActiveTab');
        setResults({});
        setActiveTab(0);
      }
    }
  };

  // Проверяем данные при загрузке компонента
  React.useEffect(() => {
    checkAndClearStaleData();
  }, []);

  // Функция для красивого форматирования текста анализа
  const formatAnalysisText = (text) => {
    if (!text) return '';
    
    // Разбиваем текст на строки
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // Заголовки (####)
      if (trimmedLine.startsWith('####')) {
        return (
          <Typography 
            key={index} 
            variant="h6" 
            sx={{ 
              fontWeight: 700, 
              color: '#1E293B', 
              mt: 3, 
              mb: 2,
              fontSize: '1.1rem',
              borderBottom: '2px solid #E2E8F0',
              pb: 1
            }}
          >
            {trimmedLine.replace('####', '').trim()}
          </Typography>
        );
      }
      
      // Подзаголовки (###)
      if (trimmedLine.startsWith('###')) {
        return (
          <Typography 
            key={index} 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 600, 
              color: '#2563EB', 
              mt: 2.5, 
              mb: 1.5,
              fontSize: '1rem'
            }}
          >
            {trimmedLine.replace('###', '').trim()}
          </Typography>
        );
      }
      
      // Подподзаголовки (##)
      if (trimmedLine.startsWith('##')) {
        return (
          <Typography 
            key={index} 
            variant="subtitle2" 
            sx={{ 
              fontWeight: 600, 
              color: '#475569', 
              mt: 2, 
              mb: 1,
              fontSize: '0.95rem'
            }}
          >
            {trimmedLine.replace('##', '').trim()}
          </Typography>
        );
      }
      
      // Списки (• или -)
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        return (
          <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
            <Typography sx={{ color: '#2563EB', mr: 1, mt: 0.2, fontSize: '1.2rem' }}>•</Typography>
            <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6, flex: 1 }}>
              {trimmedLine.replace(/^[•-]\s*/, '')}
            </Typography>
          </Box>
        );
      }
      
      // Пустые строки
      if (trimmedLine === '') {
        return <Box key={index} sx={{ height: 8 }} />;
      }
      
      // Обычный текст
      return (
        <Typography 
          key={index} 
          variant="body2" 
          sx={{ 
            color: '#374151', 
            lineHeight: 1.6, 
            mb: 1,
            fontSize: '0.9rem'
          }}
        >
          {trimmedLine}
        </Typography>
      );
    });
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: '#F8FAFC',
      width: '100%'
    }}>
      {/* Header */}
      <Box sx={{ 
        background: 'white',
        py: 2,
        width: '100%'
      }}>
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AutoAwesomeIcon sx={{ mr: 2, fontSize: 28, color: '#2196F3' }} />
            <Typography variant="h5" fontWeight={700} color="#1E293B">
              AI Анализ CRM
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              label="AI Анализ" 
              color="primary" 
              icon={<AutoAwesomeIcon />}
              sx={{ fontWeight: 600 }}
            />
            {(results.crm || results.excel2025 || results.comparison) && (
              <Button
                variant="outlined"
                size="small"
                onClick={handleResetData}
                sx={{
                  borderColor: '#F44336',
                  color: '#F44336',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#D32F2F',
                    backgroundColor: '#FFEBEE'
                  }
                }}
              >
                Сбросить фильтры
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Box sx={{ px: 3, py: 1 }}>
          <Alert severity="error" sx={{ borderRadius: 1 }}>
            {error}
          </Alert>
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ 
        px: 3, 
        py: 2 
      }}>
        {/* Tabs */}
        <Card sx={{ 
          mb: 3, 
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          width: '100%'
        }}>
          <Box sx={{ 
            background: '#F8FAFC'
          }}>
            <Tabs 
              value={activeTab} 
              onChange={(_, newValue) => {
                setActiveTab(newValue);
                // Сохраняем активную вкладку в localStorage
                localStorage.setItem('aiAnalysisActiveTab', newValue.toString());
              }}
              sx={{ 
                px: 2,
                pt: 1,
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  minHeight: 48,
                  borderRadius: '6px 6px 0 0',
                  mx: 0.5,
                  color: '#64748B',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    color: '#475569',
                    background: 'rgba(255,255,255,0.7)'
                  }
                },
                '& .Mui-selected': {
                  color: '#1E293B',
                  background: 'white',
                  boxShadow: '0 -1px 4px rgba(0,0,0,0.04)',
                  borderBottom: '2px solid #2196F3'
                }
              }}
            >
              <Tab label="CRM 2018-2024" value={0} />
              <Tab label="CRM 2025" value={1} />
              <Tab label="Сравнение периодов" value={2} />
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>
            {/* CRM 2018-2024 Content */}
            {activeTab === 0 && (
              <Fade in={true} timeout={300}>
                <Box>
                  {/* Action Card */}
                  <Card sx={{ 
                    mb: 3,
                    background: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)',
                    color: 'white',
                    borderRadius: 2,
                    boxShadow: '0 4px 16px rgba(33, 150, 243, 0.2)',
                    width: '100%'
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <AnalyticsIcon sx={{ mr: 2, fontSize: 32 }} />
                          <Box>
                            <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                              Анализ CRM 2018-2024
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              Исторические данные доноров и аналитика
                            </Typography>
                          </Box>
                        </Box>
                        <Button
                          variant="contained"
                          size="large"
                          onClick={() => handleAnalyze('crm', endpoints[0].endpoint)}
                          disabled={loading['crm']}
                          sx={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: 1.5,
                            px: 3,
                            py: 1,
                            fontSize: 14,
                            fontWeight: 600,
                            textTransform: 'none',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            '&:hover': {
                              background: 'rgba(255, 255, 255, 0.3)',
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            },
                            '&:disabled': {
                              background: 'rgba(255, 255, 255, 0.1)',
                              transform: 'none',
                            }
                          }}
                        >
                          {loading['crm'] ? (
                            <CircularProgress size={18} sx={{ color: 'white', mr: 1 }} />
                          ) : (
                            endpoints[0].icon
                          )}
                          {endpoints[0].label}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                  
                  {results.crm ? (
                    <Fade in={true} timeout={500}>
                      <Box>
                        <MetricsCards stats={results.crm.aggregated_statistics} />
                        
                        {/* AI Analysis Card */}
                        {results.crm.ai_analysis && (
                          <Card sx={{ 
                            mb: 3, 
                            borderRadius: 2,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            overflow: 'hidden',
                            width: '100%'
                          }}>
                            <Box sx={{ 
                              background: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)',
                              p: 2,
                              color: 'white'
                            }}>
                              <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                                <AutoAwesomeIcon sx={{ mr: 1.5 }} />
                                AI Анализ
                              </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                                Дата анализа: {results.crm.analysis_timestamp && new Date(results.crm.analysis_timestamp).toLocaleString('ru-RU')}
                              </Typography>
                            </Box>
                            <CardContent sx={{ p: 3 }}>
                              <Box sx={{ 
                                background: '#FAFBFC',
                                borderRadius: 2,
                                p: 2,
                                border: '1px solid #E2E8F0'
                              }}>
                                {formatAnalysisText(results.crm.ai_analysis)}
                              </Box>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* Charts Grid */}
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                          <Grid item xs={12} lg={6}>
                            <MonthTableCard 
                              title="Распределение по месяцам" 
                              data={getMonthBarData(results.crm.aggregated_statistics?.monthly_statistics)} 
                              type="month"
                            />
                          </Grid>
                          <Grid item xs={12} lg={6}>
                            <MonthTableCard 
                              title="Распределение по источникам" 
                              data={getSourceBarData(results.crm.aggregated_statistics?.source_statistics)} 
                              type="source"
                            />
                          </Grid>
                        </Grid>
                        
                        <StatsTable title="Детальная статистика" stats={results.crm.aggregated_statistics} />
                      </Box>
                    </Fade>
                  ) : (
                    <EmptyState 
                      icon={<AnalyticsIcon />}
                      title="Данные не загружены"
                      description="Нажмите кнопку анализа для загрузки данных CRM 2018-2024"
                    />
                  )}
                </Box>
              </Fade>
            )}

            {/* CRM 2025 Content */}
            {activeTab === 1 && (
              <Fade in={true} timeout={300}>
                <Box>
                  {/* Action Card */}
                  <Card sx={{ 
                    mb: 3,
                    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
                    color: 'white',
                    borderRadius: 2,
                    boxShadow: '0 4px 16px rgba(255, 107, 107, 0.2)',
                    width: '100%'
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <BarChartIcon sx={{ mr: 2, fontSize: 32 }} />
                          <Box>
                            <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                              Анализ CRM 2025
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              Современные данные доноров и аналитика
                            </Typography>
                          </Box>
                        </Box>
                        <Button
                          variant="contained"
                          size="large"
                          onClick={() => handleAnalyze('excel2025', endpoints[1].endpoint)}
                          disabled={loading['excel2025']}
                          sx={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: 1.5,
                            px: 3,
                            py: 1,
                            fontSize: 14,
                            fontWeight: 600,
                            textTransform: 'none',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            '&:hover': {
                              background: 'rgba(255, 255, 255, 0.3)',
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            },
                            '&:disabled': {
                              background: 'rgba(255, 255, 255, 0.1)',
                              transform: 'none',
                            }
                          }}
                        >
                          {loading['excel2025'] ? (
                            <CircularProgress size={18} sx={{ color: 'white', mr: 1 }} />
                          ) : (
                            endpoints[1].icon
                          )}
                          {endpoints[1].label}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                  
                  {results.excel2025 ? (
                    <Fade in={true} timeout={500}>
                      <Box>
                        <MetricsCards stats={results.excel2025.aggregated_statistics} />
                        
                        {/* AI Analysis Card */}
                        {results.excel2025.ai_analysis && (
                          <Card sx={{ 
                            mb: 3, 
                            borderRadius: 2,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            overflow: 'hidden',
                            width: '100%'
                          }}>
                            <Box sx={{ 
                              background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
                              p: 2,
                              color: 'white'
                            }}>
                              <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                                <AutoAwesomeIcon sx={{ mr: 1.5 }} />
                                AI Анализ
                              </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                                Дата анализа: {results.excel2025.analysis_timestamp && new Date(results.excel2025.analysis_timestamp).toLocaleString('ru-RU')}
                              </Typography>
                            </Box>
                            <CardContent sx={{ p: 3 }}>
                              <Box sx={{ 
                                background: '#FAFBFC',
                                borderRadius: 2,
                                p: 2,
                                border: '1px solid #E2E8F0'
                              }}>
                                {formatAnalysisText(results.excel2025.ai_analysis)}
                              </Box>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* Charts Grid */}
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                          <Grid item xs={12} lg={6}>
                            <MonthTableCard 
                              title="Распределение по месяцам" 
                              data={getMonthBarData(results.excel2025.aggregated_statistics?.monthly_statistics)} 
                              type="month"
                            />
                          </Grid>
                          <Grid item xs={12} lg={6}>
                            <MonthTableCard 
                              title="Распределение по источникам" 
                              data={getSourceBarData(results.excel2025.aggregated_statistics?.source_statistics)} 
                              type="source"
                            />
                          </Grid>
                        </Grid>
                        
                        <StatsTable title="Детальная статистика" stats={results.excel2025.aggregated_statistics} />
                      </Box>
                    </Fade>
                  ) : (
                    <EmptyState 
                      icon={<BarChartIcon />}
                      title="Данные не загружены"
                      description="Нажмите кнопку анализа для загрузки данных CRM 2025"
                    />
                  )}
                </Box>
              </Fade>
            )}

            {/* Сравнение периодов Content */}
            {activeTab === 2 && (
              <Fade in={true} timeout={300}>
                <Box>
                  {/* Action Card */}
                  <Card sx={{ 
                    mb: 3,
                    background: 'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
                    color: 'white',
                    borderRadius: 2,
                    boxShadow: '0 4px 16px rgba(156, 39, 176, 0.2)',
                    width: '100%'
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <AssessmentIcon sx={{ mr: 2, fontSize: 32 }} />
                          <Box>
                            <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                              Сравнение периодов
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              Сравнительный анализ CRM 2018-2024 и CRM 2025
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            size="large"
                            onClick={() => handleAnalyze('comparison', endpoints[2].endpoint)}
                            disabled={loading['comparison']}
                            sx={{
                              background: 'rgba(255, 255, 255, 0.2)',
                              borderRadius: 1.5,
                              px: 3,
                              py: 1,
                              fontSize: 14,
                              fontWeight: 600,
                              textTransform: 'none',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255, 255, 255, 0.3)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              '&:hover': {
                                background: 'rgba(255, 255, 255, 0.3)',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              },
                              '&:disabled': {
                                background: 'rgba(255, 255, 255, 0.1)',
                                transform: 'none',
                              }
                            }}
                          >
                            {loading['comparison'] ? (
                              <CircularProgress size={18} sx={{ color: 'white', mr: 1 }} />
                            ) : (
                              endpoints[2].icon
                            )}
                            {endpoints[2].label}
                          </Button>
                          
                          {results.comparison && (
                            <Button
                              variant="outlined"
                              size="large"
                              onClick={() => {
                                const newResults = { ...results };
                                delete newResults.comparison;
                                setResults(newResults);
                                localStorage.setItem('aiAnalysisResults', JSON.stringify(newResults));
                              }}
                              sx={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                                color: 'white',
                                borderRadius: 1.5,
                                px: 3,
                                py: 1,
                                fontSize: 14,
                                fontWeight: 600,
                                textTransform: 'none',
                                backdropFilter: 'blur(10px)',
                                '&:hover': {
                                  background: 'rgba(255, 255, 255, 0.2)',
                                  borderColor: 'rgba(255, 255, 255, 0.5)',
                                }
                              }}
                            >
                              Сбросить фильтры
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                  
                  {console.log('Rendering comparison tab, results.comparison:', results.comparison)}
                  {results.comparison ? (
                    <Fade in={true} timeout={500}>
                      <Box>
                        <ComparisonMetricsCards comparisonData={results.comparison} />
                        
                        {/* AI Analysis Card */}
                        {results.comparison.ai_analysis && (
                          <Card sx={{ 
                            mb: 3, 
                            borderRadius: 2,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            overflow: 'hidden',
                            width: '100%'
                          }}>
                            <Box sx={{ 
                              background: 'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
                              p: 2,
                              color: 'white'
                            }}>
                              <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                                <AutoAwesomeIcon sx={{ mr: 1.5 }} />
                                AI Сравнительный анализ
                              </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                                Дата анализа: {results.comparison.analysis_timestamp && new Date(results.comparison.analysis_timestamp).toLocaleString('ru-RU')}
                              </Typography>
                            </Box>
                            <CardContent sx={{ p: 3 }}>
                              <Box sx={{ 
                                background: '#FAFBFC',
                                borderRadius: 2,
                                p: 2,
                                border: '1px solid #E2E8F0'
                              }}>
                                {formatAnalysisText(results.comparison.ai_analysis)}
                              </Box>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* Periods Comparison Grid */}
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                          <Grid item xs={12} lg={6}>
                            <Card sx={{ 
                              height: '100%',
                              borderRadius: 2,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                              overflow: 'hidden'
                            }}>
                              <Box sx={{ 
                                background: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)',
                                p: 2,
                                color: 'white'
                              }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                                  <AnalyticsIcon sx={{ mr: 1.5 }} />
                                  CRM 2018-2024
                                </Typography>
                              </Box>
                              <CardContent sx={{ p: 2 }}>
                                <StatsTable title="Статистика периода" stats={results.comparison.periods?.crm_2018_2024?.aggregated_statistics} />
                              </CardContent>
                            </Card>
                          </Grid>
                          <Grid item xs={12} lg={6}>
                            <Card sx={{ 
                              height: '100%',
                              borderRadius: 2,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                              overflow: 'hidden'
                            }}>
                              <Box sx={{ 
                                background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
                                p: 2,
                                color: 'white'
                              }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                                  <BarChartIcon sx={{ mr: 1.5 }} />
                                  CRM 2025
                                </Typography>
                              </Box>
                              <CardContent sx={{ p: 2 }}>
                                <StatsTable title="Статистика периода" stats={results.comparison.periods?.crm_2025?.aggregated_statistics} />
                              </CardContent>
                            </Card>
                          </Grid>
                        </Grid>
                      </Box>
                    </Fade>
                  ) : (
                    <EmptyState 
                      icon={<AssessmentIcon />}
                      title="Сравнение не выполнено"
                      description="Нажмите кнопку сравнения для анализа различий между периодами"
                    />
                  )}
                </Box>
              </Fade>
            )}


          </Box>
        </Card>
      </Box>
    </Box>
  );
}