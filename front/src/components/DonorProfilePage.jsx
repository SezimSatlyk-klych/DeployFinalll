import React, { useState, useEffect } from 'react';
import { Container, Button, Box, Typography, Alert, Divider, Grid, Paper, Table, TableHead, TableRow, TableCell, TableBody, Card, CardContent } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function getMonthStats(transactions) {
  const stats = {};
  if (!Array.isArray(transactions)) return stats;
  
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];
  
  console.log('Processing transactions for month stats:', transactions);
  
  transactions.forEach(tr => {
    console.log('Processing transaction:', tr);
    console.log('Transaction keys:', Object.keys(tr));
    
    // Пробуем разные варианты полей для месяца
    let m = tr["month"] || tr['Месяц'] || tr['месяц'];
    
    // Если месяц не найден, пробуем извлечь из даты
    if (!m && tr['Дата']) {
      console.log('Extracting month from date:', tr['Дата']);
      const parts = tr['Дата'].includes('.') ? tr['Дата'].split('.') : tr['Дата'].split('-');
      console.log('Date parts:', parts);
      const monthIdx = parts.length >= 2 ? Number(parts[1]) - 1 : -1;
      console.log('Month index:', monthIdx);
      if (monthIdx >= 0 && monthIdx < 12) {
        m = monthNames[monthIdx];
        console.log('Extracted month:', m);
      }
    }
    
    if (!m) {
      m = '—';
      console.log('No month found, using default');
    }
    
    // Пробуем разные варианты полей для суммы - добавляем больше вариантов
    const amount = Number(tr["Сумма"]) || Number(tr["сумма"]) || Number(tr["Amount"]) || Number(tr["amount"]) || 
                   Number(tr["Дебет"]) || Number(tr["дебет"]) || Number(tr["Debit"]) || Number(tr["debit"]) ||
                   Number(tr["Кред"]) || Number(tr["кред"]) || Number(tr["Кредит"]) || Number(tr["кредит"]) ||
                   Number(tr["Credit"]) || Number(tr["credit"]) || 0;
    
    console.log('Trying to extract amount from fields:');
    console.log('  Сумма:', tr["Сумма"]);
    console.log('  сумма:', tr["сумма"]);
    console.log('  Amount:', tr["Amount"]);
    console.log('  amount:', tr["amount"]);
    console.log('  Дебет:', tr["Дебет"]);
    console.log('  дебет:', tr["дебет"]);
    console.log('  Кред:', tr["Кред"]);
    console.log('  кред:', tr["кред"]);
    console.log('  Кредит:', tr["Кредит"]);
    console.log('  кредит:', tr["кредит"]);
    console.log('  Final amount:', amount);
    
    stats[m] = (stats[m] || 0) + amount;
    console.log(`Month: ${m}, Amount: ${amount}, Total for month: ${stats[m]}`);
  });
  
  console.log('Final month stats:', stats);
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

  // Обработка данных для CRM 2018-2024
  let user_info, stats, transactions;
  
  if (data.donator_info) {
    // Старый формат данных
    user_info = data.donator_info;
    transactions = data.donations || [];
    
    if (!data.stats && Array.isArray(data.donations)) {
      const donationsArr = data.donations;
      const total_count = donationsArr.length;
      const total_amount = donationsArr.reduce((sum, d) => sum + (Number(d['Сумма']) || Number(d['сумма']) || 0), 0);
      const average_amount = total_count ? Math.round(total_amount / total_count) : 0;
      const parseDate = str => {
        if (!str) return null;
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
      const last_donation = sortedByDate[sortedByDate.length - 1]?.d['Дата'] || '-';
      stats = { total_count, total_amount, average_amount, last_transaction: last_donation };
    } else {
      stats = data.stats;
    }
  } else {
    // Новый формат данных (как в CRM 2025)
    user_info = data.user_info;
    stats = data.stats;
    transactions = data.transactions;
  }
  
  // Добавляем отладочную информацию
  console.log('Data structure:', data);
  console.log('Transactions:', transactions);
  console.log('Stats:', stats);
  console.log('User info:', user_info);
  const monthStats = getMonthStats(transactions);
  const months = Object.keys(monthStats);
  
  // Если нет данных по месяцам, показываем хотя бы один месяц
  if (months.length === 0 || (months.length === 1 && months[0] === '—')) {
    monthStats['Январь'] = 0;
  }
  
  const maxValue = Math.max(...Object.values(monthStats), 1);

  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
      <Button variant="outlined" sx={{ mb: 3 }} onClick={onBack}>&larr; Назад к CRM 2018-2024</Button>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 5 }, borderRadius: 5, background: '#fafdff', boxShadow: '0 8px 40px 0 rgba(66,165,245,0.10)' }}>
        {/* Заголовок */}
        <Typography variant="h4" fontWeight={700} sx={{ color: '#2563eb', mb: 1, letterSpacing: 0.5 }}>
          {user_info?.ФИО || donorKey}
        </Typography>
        <Typography variant="body1" sx={{ color: '#6b7280', mb: 3, fontSize: 16 }}>{user_info?.gender ? `Пол: ${user_info.gender}` : ''}</Typography>
        {/* Карточки статистики */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'linear-gradient(120deg, #e0eafc 0%, #b6e0fe 100%)', borderRadius: 4, boxShadow: '0 2px 12px #b6e0fe33' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                <Typography sx={{ color: '#2563eb', fontSize: 36, fontWeight: 800, mb: 1, lineHeight: '36px', transform: 'translateY(-2px)' }}>₸</Typography>
                <Typography variant="h5" fontWeight={800}>{stats?.total_amount ?? '-'}</Typography>
                <Typography variant="body2" color="text.secondary">Сумма</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'linear-gradient(120deg, #e0eafc 0%, #b6e0fe 100%)', borderRadius: 4, boxShadow: '0 2px 12px #b6e0fe33' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                <BarChartIcon sx={{ color: '#2563eb', fontSize: 36, mb: 1 }} />
                <Typography variant="h5" fontWeight={800}>{stats?.total_count ?? '-'}</Typography>
                <Typography variant="body2" color="text.secondary">Донатов</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'linear-gradient(120deg, #e0eafc 0%, #b6e0fe 100%)', borderRadius: 4, boxShadow: '0 2px 12px #b6e0fe33' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                <Typography sx={{ color: '#2563eb', fontSize: 36, fontWeight: 800, mb: 1, lineHeight: '36px', transform: 'translateY(-2px)' }}>₸</Typography>
                <Typography variant="h5" fontWeight={800}>{stats?.average_amount ?? '-'}</Typography>
                <Typography variant="body2" color="text.secondary">Средний чек</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'linear-gradient(120deg, #e0eafc 0%, #b6e0fe 100%)', borderRadius: 4, boxShadow: '0 2px 12px #b6e0fe33' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                <CalendarMonthIcon sx={{ color: '#2563eb', fontSize: 36, mb: 1 }} />
                <Typography variant="h5" fontWeight={800}>{stats?.last_transaction ? stats.last_transaction.split('T')[0] : '-'}</Typography>
                <Typography variant="body2" color="text.secondary">Последний донат</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        {/* Мини-график по месяцам */}
        {months.length > 0 && (
          <Box sx={{ mb: 5, mt: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#2563eb', fontSize: 20, letterSpacing: 0.5 }}>
              Активность по месяцам
            </Typography>
            <Box sx={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 3,
              height: 160,
              bgcolor: '#f4f8ff',
              borderRadius: 4,
              p: 3,
              overflowX: 'auto',
              boxShadow: '0 2px 12px #b6e0fe22',
              minWidth: 340,
            }}>
              {months.map(month => {
                const isMax = monthStats[month] === maxValue && maxValue > 0;
                return (
                  <Box key={month} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 48 }}>
                    {/* Значение сверху */}
                    <Typography variant="body2" sx={{ color: isMax ? '#2563eb' : '#222', fontWeight: isMax ? 900 : 500, mb: 0.5, fontSize: 18 }}>{monthStats[month]}</Typography>
                    {/* Бар */}
                    <Box sx={{
                      height: `${100 * (monthStats[month] / maxValue)}px`,
                      width: 30,
                      background: isMax
                        ? 'linear-gradient(180deg, #42a5f5 0%, #2563eb 100%)'
                        : 'linear-gradient(180deg, #b6e0fe 0%, #2563eb 100%)',
                      borderRadius: 3,
                      mb: 1,
                      boxShadow: isMax ? '0 4px 16px #2563eb33' : '0 2px 8px #b6e0fe22',
                      transition: 'height 0.5s cubic-bezier(.4,2,.6,1)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                    }} />
                    {/* Название месяца */}
                    <Typography variant="body2" sx={{ color: isMax ? '#2563eb' : '#888', fontWeight: isMax ? 700 : 500, mt: 0.5, fontSize: 15, letterSpacing: 0.5 }}>
                      {month}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
        <Divider sx={{ my: 4 }} />
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#2563eb' }}>История транзакций</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ borderRadius: 3, overflow: 'hidden', background: '#fff' }}>
            <TableHead>
              <TableRow sx={{ background: '#e0eafc' }}>
                {transactions && transactions[0] && Object.keys(transactions[0]).map(col => (
                  <TableCell key={col} sx={{ fontWeight: 700, color: '#2563eb' }}>{col}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(transactions) && transactions.length > 0 ? transactions.map((tr, idx) => (
                <TableRow key={tr.id || idx} sx={{ background: idx % 2 === 0 ? '#fafdff' : '#f4f8ff' }}>
                  {Object.keys(tr).map(col => (
                    <TableCell key={col}>{tr[col]}</TableCell>
                  ))}
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={10} align="center">Нет транзакций</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Container>
  );
}

export default DonorProfilePage; 