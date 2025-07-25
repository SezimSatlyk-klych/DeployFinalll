import React, { useState, useEffect } from 'react';
import { Container, Button, Box, Typography, Alert, Paper, Grid, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Divider } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Подсчёт суммы по месяцам (по полю "Месяц" или вычисляя из даты)
function getMonthStats(donations = []) {
  const stats = {};
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];
  donations.forEach(tr => {
    let m = tr['Месяц'] || tr['month'];
    if (!m && tr['Дата']) {
      // "Дата" может быть в формате DD.MM.YYYY или YYYY-MM-DD
      const parts = tr['Дата'].includes('.') ? tr['Дата'].split('.') : tr['Дата'].split('-');
      const monthIdx = parts.length >= 2 ? Number(parts[1]) - 1 : -1;
      if (monthIdx >= 0 && monthIdx < 12) m = monthNames[monthIdx];
    }
    if (!m) m = '—';
    stats[m] = (stats[m] || 0) + (Number(tr['Сумма']) || 0);
  });
  return stats;
}

// Удаляем служебные части из строки ФИО
const cleanName = (raw = '') => {
  const idx = raw.search(/\b(БИН|BIN|IIK|ИИК|ИИН|IIN|БИК|BIK):/i);
  return (idx !== -1 ? raw.slice(0, idx) : raw).trim();
};

function DonorProfilePage({ donorKey, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // handleExport removed

  useEffect(() => {
    setLoading(true);
    setError('');
    const trimmedKey = cleanName(donorKey || '');
    fetch(`${API_BASE}/api/crm/donator_profile?key=${encodeURIComponent(trimmedKey)}`)
      .then(res => {
        if (!res.ok) throw new Error('Ошибка загрузки профиля');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [donorKey]);

  if (loading) return <Typography>Загрузка...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Typography>Нет данных по донору.</Typography>;

  if (!data.stats && Array.isArray(data.donations)) {
    const donationsArr = data.donations;
    const total_count = donationsArr.length;
    const total_amount = donationsArr.reduce((sum, d) => sum + (Number(d['Сумма']) || 0), 0);
    const average_amount = total_count ? Math.round(total_amount / total_count) : 0;
    const parseDate = str => {
      if (!str) return null;
      // try DD.MM.YYYY or YYYY-MM-DD
      const parts = str.includes('.') ? str.split('.') : str.split('-');
      if (parts.length === 3) {
        const [d, m, y] = parts.length === 3 && str.includes('.') ? parts : [parts[2], parts[1], parts[0]];
        return new Date(`${y}-${m}-${d}`);
      }
      return null;
    };
    const sortedByDate = donationsArr
      .map(d => ({ d, dateObj: parseDate(d['Дата']) }))
      .filter(x => x.dateObj)
      .sort((a, b) => a.dateObj - b.dateObj);
    const first_donation = sortedByDate[0]?.d['Дата'] || '-';
    const last_donation = sortedByDate[sortedByDate.length - 1]?.d['Дата'] || '-';
    data.stats = { total_count, total_amount, average_amount, first_donation, last_donation };
  }

  // Вычисляем активность по месяцам (сумму донатов)
  const monthStats = getMonthStats(data.donations);
  const months = Object.keys(monthStats);
  const maxValue = Math.max(...Object.values(monthStats), 1);

  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
      <Button variant="outlined" sx={{ mb: 3 }} onClick={onBack}>&larr; Назад к CRM 2018-2024</Button>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 5 }, borderRadius: 5, background: '#fafdff', boxShadow: '0 8px 40px 0 rgba(66,165,245,0.10)' }}>
        {/* Заголовок */}
        <Typography variant="h3" fontWeight={900} sx={{ color: '#2563eb', mb: 1, letterSpacing: 1, textShadow: '0 2px 12px #b6e0fe55' }}>
          {data.donator_info?.ФИО || cleanName(donorKey || '')}
        </Typography>
        {/* Карточки статистики */}
        {data.stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 4, boxShadow: '0 2px 12px #b6e0fe33' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                  <Typography sx={{ color: '#2563eb', fontSize: 36, fontWeight: 800, mb: 1 }}>₸</Typography>
                  <Typography variant="h5" fontWeight={800}>{data.stats.total_amount}</Typography>
                  <Typography variant="body2" color="text.secondary">Сумма</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 4, boxShadow: '0 2px 12px #b6e0fe33' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                  <BarChartIcon sx={{ color: '#2563eb', fontSize: 36, mb: 1 }} />
                  <Typography variant="h5" fontWeight={800}>{data.stats.total_count}</Typography>
                  <Typography variant="body2" color="text.secondary">Донатов</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 4, boxShadow: '0 2px 12px #b6e0fe33' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                  <Typography sx={{ color: '#2563eb', fontSize: 36, fontWeight: 800, mb: 1 }}>₸</Typography>
                  <Typography variant="h5" fontWeight={800}>{data.stats.average_amount}</Typography>
                  <Typography variant="body2" color="text.secondary">Средний чек</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 4, boxShadow: '0 2px 12px #b6e0fe33' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                  <CalendarMonthIcon sx={{ color: '#2563eb', fontSize: 36, mb: 1 }} />
                  <Typography variant="h5" fontWeight={800}>{data.stats.last_donation}</Typography>
                  <Typography variant="body2" color="text.secondary">Последний донат</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
        {/* График по месяцам */}
        {months.length > 0 && (
          <Box sx={{ mb: 5, mt: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#2563eb', fontSize: 20, letterSpacing: 0.5 }}>
              Активность по месяцам
            </Typography>
            <Card sx={{ 
              borderRadius: 4, 
              boxShadow: '0 2px 12px #b6e0fe22',
              background: '#f4f8ff',
              p: 3
            }}>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={months.map(month => ({ month, value: monthStats[month] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0eafc" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12, fill: '#64748B' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#64748B' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                      tickFormatter={(value) => value.toLocaleString('ru-RU')}
                    />
                    <Tooltip 
                      formatter={(value) => [value.toLocaleString('ru-RU'), 'Сумма']}
                      contentStyle={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: 6,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        backdropFilter: 'blur(10px)'
                      }}
                      labelStyle={{ color: '#374151', fontWeight: 600 }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="#2563eb"
                      radius={[4, 4, 0, 0]}
                      background={{ fill: '#f8fafc' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Card>
          </Box>
        )}
        <Divider sx={{ my: 4 }} />
        {/* Таблица донатов */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#2563eb' }}>История донатов</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ borderRadius: 3, overflow: 'hidden', background: '#fff' }}>
            <TableHead>
              <TableRow sx={{ background: '#e0eafc' }}>
                {data.donations && data.donations[0] && Object.keys(data.donations[0]).map(col => (
                  <TableCell key={col} sx={{ fontWeight: 700, color: '#2563eb' }}>{col}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(data.donations) && data.donations.length > 0 ? data.donations.map((row, idx) => (
                <TableRow key={idx} sx={{ background: idx % 2 === 0 ? '#fafdff' : '#f4f8ff' }}>
                  {Object.keys(row).map(col => (
                    <TableCell key={col}>{row[col]}</TableCell>
                  ))}
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={10} align="center">Нет донатов</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Container>
  );
}

export default DonorProfilePage; 