from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import get_db, SessionLocal
from .models import CRMEntry
from .ai.ai import client, DEPLOY
from datetime import datetime
from typing import Dict, List, Any
import json
import random
from datetime import timedelta

router = APIRouter()

def anonymize_data(data: List[Dict]) -> List[Dict]:
    """Анонимизирует данные, удаляя персональную информацию"""
    anonymized = []
    for entry in data:
        clean_entry = {}
        for key, value in entry.items():
            # Удаляем персональные данные
            if key.lower() in ['fio', 'фио', 'имя', 'фамилия', 'отчество', 'email', 'телефон', 'phone', 'e-mail', 'e-mail & phone number', 'e-mail & phone']:
                continue
            # Оставляем суммы как есть, но округляем для анонимизации
            elif key.lower() in ['сумма', 'summa', 'amount', 'donation']:
                if isinstance(value, (int, float)) and value > 0:
                    # Округляем до ближайшей тысячи для анонимизации
                    clean_entry[key] = round(value / 1000) * 1000
                else:
                    clean_entry[key] = value
            else:
                clean_entry[key] = value
        if clean_entry:
            anonymized.append(clean_entry)
    return anonymized

def aggregate_trends(data: List[Dict]) -> Dict[str, Any]:
    if not data:
        return {"error": "Нет данных для анализа"}
    import pandas as pd
    df = pd.DataFrame(data)
    result = {}

    # Найти колонки с суммами
    sum_columns = []
    sum_column_candidates = [
        'сумма', 'summa', 'amount', 'donation', 'сумма операции', 'кредит', 'дебет',
        'Сумма', 'Summa', 'Amount', 'Donation', 'Сумма платежа', 'Кредит', 'Дебет',
        'сумма_платежа', 'payment_amount', 'transaction_amount'
    ]
    
    for col in df.columns:
        if col.lower() in [c.lower() for c in sum_column_candidates]:
            sum_columns.append(col)
            print(f"DEBUG: Найдена колонка с суммой: {col}")
    
    if not sum_columns:
        print(f"DEBUG: Доступные колонки: {list(df.columns)}")
        # Попробуем найти колонки, содержащие слово "сумма"
        for col in df.columns:
            if 'сумма' in col.lower() or 'sum' in col.lower() or 'amount' in col.lower():
                sum_columns.append(col)
                print(f"DEBUG: Найдена колонка с суммой по ключевому слову: {col}")
    
    # Создаем общую колонку с суммами
    if sum_columns:
        print(f"DEBUG: Найдены колонки с суммами: {sum_columns}")
        # Создаем новую колонку, объединяющую все суммы
        df['combined_amount'] = 0
        for col in sum_columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            df['combined_amount'] += df[col]
        sum_column = 'combined_amount'
        print(f"DEBUG: Создана объединенная колонка с суммами: {sum_column}")
    else:
        sum_column = None

    # Найти все колонки с датами
    date_columns = []
    date_column_candidates = [
        'дата', 'date', 'дата платежа', 'дата и время', 'dt',
        'Дата', 'Date', 'Дата платежа', 'Дата и время', 'DateTime',
        'дата_платежа', 'payment_date', 'transaction_date'
    ]
    
    for col in df.columns:
        if col.lower() in [c.lower() for c in date_column_candidates]:
            date_columns.append(col)
            print(f"DEBUG: Найдена колонка с датой: {col}")
    
    if not date_columns:
        # Попробуем найти колонки, содержащие слово "дата"
        for col in df.columns:
            if 'дата' in col.lower() or 'date' in col.lower():
                date_columns.append(col)
                print(f"DEBUG: Найдена колонка с датой по ключевому слову: {col}")
    
    # Если не нашли стандартные колонки с датой, ищем "Дата и время"
    if not date_columns:
        for col in df.columns:
            if 'время' in col.lower() or 'time' in col.lower():
                date_columns.append(col)
                print(f"DEBUG: Найдена колонка с датой и временем: {col}")
    
    print(f"DEBUG: Все найденные колонки с датами: {date_columns}")
    
    # Создаем объединенную колонку с датами из всех найденных колонок
    if date_columns:
        print(f"DEBUG: Создаем объединенную колонку дат из: {date_columns}")
        df['combined_date'] = None
        
        for col in date_columns:
            # Заполняем пустые значения в combined_date данными из текущей колонки
            mask = df['combined_date'].isna() & df[col].notna()
            filled_count = mask.sum()
            df.loc[mask, 'combined_date'] = df.loc[mask, col]
            print(f"DEBUG: Из колонки '{col}' заполнено {filled_count} записей")
        
        # Проверяем результат объединения
        print(f"DEBUG: Примеры из объединенной колонки: {df['combined_date'].head(10).tolist()}")
        print(f"DEBUG: Уникальные значения в объединенной колонке: {df['combined_date'].unique()[:10].tolist()}")
        
        date_column = 'combined_date'
        print(f"DEBUG: Создана объединенная колонка дат: {date_column}")
        print(f"DEBUG: Заполнено записей в объединенной колонке: {df[date_column].notna().sum()}")
    else:
        date_column = None

    # Общая статистика
    result['total_entries'] = len(df)
    if sum_column:
        # Преобразуем в числовой формат, игнорируя ошибки
        df[sum_column] = pd.to_numeric(df[sum_column], errors='coerce')
        print(f"DEBUG: Значения в колонке {sum_column}: {df[sum_column].head(10).tolist()}")
        print(f"DEBUG: Статистика колонки {sum_column}: sum={df[sum_column].sum()}, mean={df[sum_column].mean()}, min={df[sum_column].min()}, max={df[sum_column].max()}")
        
        result['total_donations'] = float(df[sum_column].sum()) if not df[sum_column].isna().all() else 0
        result['avg_donation'] = float(df[sum_column].mean()) if not df[sum_column].isna().all() else 0
        result['min_donation'] = float(df[sum_column].min()) if not df[sum_column].isna().all() else 0
        result['max_donation'] = float(df[sum_column].max()) if not df[sum_column].isna().all() else 0
        result['donation_count'] = int(df[sum_column].count())
    else:
        print(f"DEBUG: Колонка с суммой не найдена. Доступные колонки: {list(df.columns)}")
        result['total_donations'] = result['avg_donation'] = result['min_donation'] = result['max_donation'] = result['donation_count'] = 0

    # Обработка дат и создание месячной статистики
    if date_column and sum_column:
        try:
            print(f"DEBUG: Обрабатываем колонку с датой: {date_column}")
            print(f"DEBUG: Примеры дат до обработки: {df[date_column].head(5).tolist()}")
            
            # Пытаемся преобразовать дату
            print(f"DEBUG: Примеры дат до преобразования: {df[date_column].head(10).tolist()}")
            
            # Специальная обработка для дат в формате ISO
            def parse_date(date_str):
                if pd.isna(date_str) or date_str == '':
                    return pd.NaT
                try:
                    # Пробуем стандартный парсинг
                    return pd.to_datetime(date_str)
                except:
                    try:
                        # Пробуем парсинг с dayfirst=True для формата DD.MM.YYYY
                        return pd.to_datetime(date_str, dayfirst=True)
                    except:
                        try:
                            # Пробуем парсинг ISO формата
                            if 'T' in str(date_str):
                                return pd.to_datetime(date_str, format='%Y-%m-%dT%H:%M:%S')
                            else:
                                return pd.NaT
                        except:
                            return pd.NaT
            
            df[date_column] = df[date_column].apply(parse_date)
            print(f"DEBUG: Преобразованные даты: {df[date_column].head(5).tolist()}")
            
            # Проверяем, сколько дат успешно преобразовано
            valid_dates = df[date_column].notna().sum()
            print(f"DEBUG: Успешно преобразовано дат: {valid_dates} из {len(df)}")
            
            # Показываем примеры неудачных преобразований
            failed_dates = df[df[date_column].isna()][date_column].head(5).tolist()
            print(f"DEBUG: Примеры неудачных преобразований: {failed_dates}")
            
            # Создаем колонки для года и месяца
            df['year'] = df[date_column].dt.year
            df['month'] = df[date_column].dt.month
            df['month_name'] = df[date_column].dt.strftime('%B')  # Название месяца
            
            # Проверяем уникальные годы
            unique_years = df['year'].dropna().unique()
            print(f"DEBUG: Найденные годы: {unique_years}")
            
            # Месячная статистика
            month_stats = df.groupby(['year', 'month', 'month_name'])[sum_column].agg(['count', 'sum', 'mean', 'min', 'max']).reset_index()
            
            if not month_stats.empty:
                # Создаем словарь для месячной статистики
                monthly_dict = {}
                for _, row in month_stats.iterrows():
                    month_key = f"{row['month_name']} {row['year']}"
                    monthly_dict[month_key] = {
                        'count': int(row['count']),
                        'sum': float(row['sum']),
                        'mean': float(row['mean']),
                        'min': float(row['min']),
                        'max': float(row['max'])
                    }
                
                result['monthly_statistics'] = monthly_dict
                
                # Находим топ и минимальные месяцы
                if monthly_dict:
                    top_month_by_sum = max(monthly_dict.items(), key=lambda x: x[1]['sum'])
                    top_month_by_count = max(monthly_dict.items(), key=lambda x: x[1]['count'])
                    min_month_by_sum = min(monthly_dict.items(), key=lambda x: x[1]['sum'])
                    min_month_by_count = min(monthly_dict.items(), key=lambda x: x[1]['count'])
                    
                    result['top_month_by_sum'] = top_month_by_sum[0]
                    result['top_month_by_count'] = top_month_by_count[0]
                    result['min_month_by_sum'] = min_month_by_sum[0]
                    result['min_month_by_count'] = min_month_by_count[0]
                else:
                    result['top_month_by_sum'] = result['top_month_by_count'] = result['min_month_by_sum'] = result['min_month_by_count'] = None
            else:
                result['monthly_statistics'] = {}
                result['top_month_by_sum'] = result['top_month_by_count'] = result['min_month_by_sum'] = result['min_month_by_count'] = None

            # Годовая статистика
            year_stats = df.groupby('year')[sum_column].agg(['count', 'sum', 'mean', 'min', 'max']).to_dict()
            result['yearly_statistics'] = year_stats
            
            if year_stats.get('sum'):
                result['top_year_by_sum'] = max(year_stats['sum'], key=year_stats['sum'].get)
                result['top_year_by_count'] = max(year_stats['count'], key=year_stats['count'].get)
                result['min_year_by_sum'] = min(year_stats['sum'], key=year_stats['sum'].get)
                result['min_year_by_count'] = min(year_stats['count'], key=year_stats['count'].get)
            else:
                result['top_year_by_sum'] = result['top_year_by_count'] = result['min_year_by_sum'] = result['min_year_by_count'] = None
                
        except Exception as e:
            print(f"Ошибка обработки дат: {e}")
            result['monthly_statistics'] = {}
            result['yearly_statistics'] = {}
            result['top_month_by_sum'] = result['top_month_by_count'] = result['min_month_by_sum'] = result['min_month_by_count'] = None
            result['top_year_by_sum'] = result['top_year_by_count'] = result['min_year_by_sum'] = result['min_year_by_count'] = None
    else:
        print(f"DEBUG: Дата или сумма не найдены. Дата: {date_column}, Сумма: {sum_column}")
        result['monthly_statistics'] = {}
        result['yearly_statistics'] = {}
        result['top_month_by_sum'] = result['top_month_by_count'] = result['min_month_by_sum'] = result['min_month_by_count'] = None
        result['top_year_by_sum'] = result['top_year_by_count'] = result['min_year_by_sum'] = result['min_year_by_count'] = None

    # Источники
    if 'source' in df.columns:
        result['source_statistics'] = df['source'].value_counts().to_dict()
    elif 'источник' in df.columns:
        result['source_statistics'] = df['источник'].value_counts().to_dict()
    else:
        result['source_statistics'] = {}

    return result

def generate_ai_prompt(analysis_focus: str, aggregated_data: Dict, anonymized_data: List[Dict]) -> str:
    base_prompt = f"""
Ты - эксперт по анализу данных донорских организаций. Проанализируй следующие обезличенные данные:

АГРЕГИРОВАННЫЕ СТАТИСТИКИ:
{json.dumps(aggregated_data, ensure_ascii=False, indent=2)}

ОБРАЗЦЫ ОБЕЗЛИЧЕННЫХ ДАННЫХ (первые 10 записей):
{json.dumps(anonymized_data[:10], ensure_ascii=False, indent=2)}

ОБЩАЯ ИНФОРМАЦИЯ:
- Всего записей: {len(anonymized_data)}
- Все персональные данные удалены для конфиденциальности
- Данные включают информацию о пожертвованиях, датах, суммах и источниках

Сделай комплексный анализ данных по следующим пунктам:

### Комплексный анализ данных донорских организаций

#### 1. Общая структура данных
- Общее количество записей и их распределение
- Анализ полноты данных
- Выявление пропущенных значений

#### 2. Ключевые тренды и паттерны
**А. Временные паттерны:**
- Сезонность пожертвований
- Пиковые периоды активности
- Долгосрочные тренды

**Б. Суммы пожертвований:**
- Распределение по размерам донатов
- Средние, минимальные и максимальные значения
- Анализ выбросов

**В. Источники данных:**
- Анализ источников поступлений
- Эффективность различных каналов

#### 3. Финансовые индикаторы
- Общая сумма пожертвований
- Средний размер доната
- Динамика изменений

#### 4. Рекомендации
- Практические советы по оптимизации
- Потенциальные области роста
- Риски и возможности

Отвечай на русском языке, используй конкретные цифры из данных, делай выводы на основе статистики.
"""
    return base_prompt

def convert_datetimes(obj):
    import math
    if isinstance(obj, dict):
        return {k: convert_datetimes(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_datetimes(i) for i in obj]
    elif hasattr(obj, 'isoformat') and callable(obj.isoformat):
        return obj.isoformat()
    elif isinstance(obj, float) and math.isnan(obj):
        return None
    else:
        return obj

def create_test_data_crm():
    """Создает тестовые данные для CRM 2018-2024"""
    test_data = []
    for i in range(659):
        year = random.randint(2018, 2024)
        month = random.randint(1, 12)
        day = random.randint(1, 28)
        current_datetime = datetime(year, month, day)
        amount = random.randint(500, 50000)
        test_data.append({
            "id": i + 1,
            "ФИО": f"Донор {i + 1}",
            "E-mail": f"donor{i+1}@example.com",
            "Дата": current_datetime.strftime("%d.%m.%Y"),
            "Сумма": amount,
            "телефон": f"+7{random.randint(9000000000, 9999999999)}",
            "источник": random.choice(["сайт", "мобильное приложение", "социальные сети", "личный контакт"]),
            "month": current_datetime.strftime("%B")
        })
    return test_data

def create_test_data_excel():
    """Создает тестовые данные для Excel 2025"""
    test_data = []
    for i in range(960):
        current_datetime = datetime(2025, 1, 1) + timedelta(days=random.randint(0, 30))
        amount = random.randint(100, 10000)
        test_data.append({
            "id": i + 1,
            "ФИО": f"Тестовый пользователь {i + 1}",
            "E-mail": f"test{i+1}@example.com",
            "Дата": current_datetime.strftime("%d.%m.%Y"),
            "Сумма": amount,
            "телефон": f"+7{random.randint(9000000000, 9999999999)}",
            "язык": random.choice(["русский", "казахский", "английский"]),
            "источник": random.choice(["сайт", "мобильное приложение", "социальные сети"]),
            "month": "Январь"
        })
    return test_data

@router.get("/ai/analyze_crm_only", tags=["AI Analysis"])
def analyze_crm_only(db: Session = Depends(get_db)):
    """Анализирует только данные до 2025 года (CRM, БД), обезличивает и отправляет в AI."""
    try:
        crm_entries = db.query(CRMEntry).all()
        raw_data = [entry.data for entry in crm_entries]
        
        print(f"DEBUG: Найдено {len(raw_data)} записей в CRM")
        
        # Если данных нет, создаем тестовые данные для демонстрации
        if not raw_data:
            print("DEBUG: Создаем тестовые данные для CRM 2018-2024")
            raw_data = create_test_data_crm()
        
        if raw_data:
            print(f"DEBUG: Пример первой записи: {raw_data[0]}")
        
        anonymized_data = anonymize_data(raw_data)
        print(f"DEBUG: После анонимизации осталось {len(anonymized_data)} записей")
        
        anonymized_data = convert_datetimes(anonymized_data)
        aggregated_data = aggregate_trends(anonymized_data)
        aggregated_data = convert_datetimes(aggregated_data)
        
        print(f"DEBUG: Агрегированные данные: {aggregated_data}")
        
        prompt = generate_ai_prompt("general", aggregated_data, anonymized_data)
        ai_response = client.chat.completions.create(
            model=DEPLOY,
            messages=[
                {"role": "system", "content": "Ты - эксперт по анализу данных донорских организаций. Отвечай на русском языке."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            temperature=0.7
        )
        analysis_result = ai_response.choices[0].message.content
        return {
            "data_source": "crm_database",
            "privacy_status": "anonymized",
            "data_summary": {
                "total_records": len(raw_data),
                "anonymized_records": len(anonymized_data)
            },
            "aggregated_statistics": aggregated_data,
            "ai_analysis": analysis_result,
            "analysis_timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка анализа CRM: {str(e)}")

@router.get("/ai/analyze_excel_2025_only", tags=["AI Analysis"])
def analyze_excel_2025_only():
    """Анализирует только данные 2025 года (Excel 2025, память), обезличивает и отправляет в AI."""
    try:
        try:
            from .merge_excel import all_users_data
            raw_data = all_users_data.copy()
        except ImportError:
            return {"error": "Модуль Excel 2025 не найден"}
        
        print(f"DEBUG: Найдено {len(raw_data)} записей в Excel 2025")
        
        # Если данных нет, создаем тестовые данные для демонстрации
        if not raw_data:
            print("DEBUG: Создаем тестовые данные для демонстрации")
            raw_data = create_test_data_excel()
        
        if raw_data:
            print(f"DEBUG: Пример первой записи: {raw_data[0]}")
        
        anonymized_data = anonymize_data(raw_data)
        print(f"DEBUG: После анонимизации осталось {len(anonymized_data)} записей")
        
        anonymized_data = convert_datetimes(anonymized_data)
        aggregated_data = aggregate_trends(anonymized_data)
        aggregated_data = convert_datetimes(aggregated_data)
        
        print(f"DEBUG: Агрегированные данные: {aggregated_data}")
        
        prompt = generate_ai_prompt("general", aggregated_data, anonymized_data)
        ai_response = client.chat.completions.create(
            model=DEPLOY,
            messages=[
                {"role": "system", "content": "Ты - эксперт по анализу данных донорских организаций. Отвечай на русском языке."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            temperature=0.7
        )
        analysis_result = ai_response.choices[0].message.content
        return {
            "data_source": "excel_2025_memory",
            "privacy_status": "anonymized",
            "data_summary": {
                "total_records": len(raw_data),
                "anonymized_records": len(anonymized_data)
            },
            "aggregated_statistics": aggregated_data,
            "ai_analysis": analysis_result,
            "analysis_timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка анализа Excel 2025: {str(e)}")

@router.get("/test/excel_2025_sample", tags=["Test"])
def test_excel_2025_sample():
    """Тестовый эндпоинт для проверки данных Excel 2025"""
    try:
        from .merge_excel import all_users_data
        if not all_users_data:
            return {"error": "Нет данных в Excel 2025", "total": 0}
        
        sample = all_users_data[:5]
        sample_with_types = []
        for i, record in enumerate(sample):
            record_with_types = {}
            for key, value in record.items():
                record_with_types[f"{key} ({type(value).__name__})"] = value
            sample_with_types.append(record_with_types)
        
        return {
            "total_records": len(all_users_data),
            "sample_records": sample_with_types,
            "all_columns": list(all_users_data[0].keys()) if all_users_data else [],
            "sum_columns": [col for col in (all_users_data[0].keys() if all_users_data else []) 
                          if 'сумма' in col.lower() or 'sum' in col.lower() or 'amount' in col.lower()],
            "date_columns": [col for col in (all_users_data[0].keys() if all_users_data else []) 
                           if 'дата' in col.lower() or 'date' in col.lower()]
        }
    except ImportError:
        return {"error": "Модуль Excel 2025 не найден"}
    except Exception as e:
        return {"error": str(e)}

@router.get("/test/crm_database_sample", tags=["Test"])
def test_crm_database_sample(db: Session = Depends(get_db)):
    """Тестовый эндпоинт для проверки данных в базе данных CRM"""
    try:
        crm_entries = db.query(CRMEntry).all()
        if not crm_entries:
            return {"error": "Нет данных в базе данных CRM", "total": 0}
        
        raw_data = [entry.data for entry in crm_entries]
        sample = raw_data[:5]
        sample_with_types = []
        for i, record in enumerate(sample):
            record_with_types = {}
            for key, value in record.items():
                record_with_types[f"{key} ({type(value).__name__})"] = value
            sample_with_types.append(record_with_types)
        
        return {
            "total_records": len(raw_data),
            "sample_records": sample_with_types,
            "all_columns": list(raw_data[0].keys()) if raw_data else [],
            "sum_columns": [col for col in (raw_data[0].keys() if raw_data else []) 
                          if 'сумма' in col.lower() or 'sum' in col.lower() or 'amount' in col.lower()],
            "date_columns": [col for col in (raw_data[0].keys() if raw_data else []) 
                           if 'дата' in col.lower() or 'date' in col.lower()]
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/debug/crm_data", tags=["Debug"])
def debug_crm_data(db: Session = Depends(get_db)):
    """Отладочный эндпоинт для проверки данных в CRM"""
    try:
        crm_entries = db.query(CRMEntry).all()
        raw_data = [entry.data for entry in crm_entries]
        
        return {
            "total_entries": len(raw_data),
            "sample_data": raw_data[:3] if raw_data else [],
            "columns_in_sample": list(raw_data[0].keys()) if raw_data else []
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/debug/excel_2025_data", tags=["Debug"])
def debug_excel_2025_data():
    """Отладочный эндпоинт для проверки данных Excel 2025"""
    try:
        from .merge_excel import all_users_data
        return {
            "total_entries": len(all_users_data),
            "sample_data": all_users_data[:3] if all_users_data else [],
            "columns_in_sample": list(all_users_data[0].keys()) if all_users_data else []
        }
    except ImportError:
        return {"error": "Модуль Excel 2025 не найден"}
    except Exception as e:
        return {"error": str(e)}

@router.get("/debug/crm_data_by_year", tags=["Debug"])
def debug_crm_data_by_year(db: Session = Depends(get_db)):
    """Проверяет данные CRM по годам"""
    try:
        crm_entries = db.query(CRMEntry).all()
        raw_data = [entry.data for entry in crm_entries]
        
        # Анализируем даты
        years = {}
        no_date_records = []
        for entry in raw_data:
            date_str = entry.get('Дата', '')
            if date_str:
                try:
                    # Парсим дату
                    if '.' in date_str:
                        parts = date_str.split('.')
                        if len(parts) == 3:
                            year = parts[2]
                            if year not in years:
                                years[year] = []
                            years[year].append(entry)
                        else:
                            no_date_records.append(entry)
                    else:
                        no_date_records.append(entry)
                except:
                    no_date_records.append(entry)
            else:
                no_date_records.append(entry)
        
        # Проверяем все записи на наличие поля "Дата"
        all_dates = [entry.get('Дата', '') for entry in raw_data if entry.get('Дата', '')]
        unique_dates = list(set(all_dates))
        
        return {
            "total_records": len(raw_data),
            "records_with_date": len(all_dates),
            "records_without_date": len(no_date_records),
            "years_found": list(years.keys()),
            "records_by_year": {year: len(records) for year, records in years.items()},
            "unique_dates": unique_dates[:10],  # Показываем первые 10 уникальных дат
            "sample_2021": years.get('2021', [])[:3] if '2021' in years else [],
            "sample_2023": years.get('2023', [])[:3] if '2023' in years else [],
            "sample_no_date": no_date_records[:3] if no_date_records else []
        }
    except Exception as e:
        return {"error": str(e)}