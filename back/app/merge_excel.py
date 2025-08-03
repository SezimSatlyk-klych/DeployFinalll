from fastapi import APIRouter, UploadFile, File, Query, Body, Form, HTTPException
from typing import List, Optional
import pandas as pd
import io
import numpy as np
from datetime import datetime
from collections import defaultdict, Counter
from fastapi.responses import StreamingResponse

router = APIRouter()

def get_month_from_date_string(date_str):
    if not date_str or pd.isnull(date_str):
        return None
    try:
        date_str = str(date_str).strip()
        if date_str.lower() in ['nan', 'nat', 'none', '']:
            return None
        parsed_date = pd.to_datetime(date_str, errors='coerce', dayfirst=True)
        return parsed_date.month if pd.notnull(parsed_date) else None
    except:
        return None

# Словарь синонимов для унификации полей
FIELD_SYNONYMS = {
    "Дата": ["Дата", "Дата платежа"],
    "E-mail": ["E-mail", "Электронная почта"],
    "Сумма": ["Сумма", "Сумма платежа"],
    # Добавь другие пары, если нужно
}

# Глобальное хранилище для всех загруженных пользователей (на время жизни процесса)
all_users_data = []



@router.post("/upload_excel_2025", tags=["Excel"])
async def upload_excel_2025(
    files: List[UploadFile] = File(...),
    sources: str = Form(None)
):
    global all_users_data
    print(f"DEBUG: Получен запрос на загрузку {len(files)} файлов")
    print(f"DEBUG: Источники: {sources}")
    try:
        all_entries = []
        month_names = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                       'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
        
        for file in files:
            print(f"DEBUG: Обрабатываем файл {file.filename}")
            try:
                content = await file.read()
                print(f"DEBUG: Размер файла {file.filename}: {len(content)} байт")
                excel = pd.ExcelFile(io.BytesIO(content))
                print(f"DEBUG: Листы в файле {file.filename}: {excel.sheet_names}")
                original_filename = file.filename
                
                for sheet_name in excel.sheet_names:
                    print(f"DEBUG: Обрабатываем лист {sheet_name}")
                    df = pd.read_excel(excel, sheet_name=sheet_name)
                    print(f"DEBUG: Размер листа {sheet_name}: {len(df)} строк")
                    
                    for _, row in df.iterrows():
                        row_data = row.to_dict()
                        # Удаляем все варианты ключа 'month' или 'месяц'
                        for key in list(row_data.keys()):
                            if key.strip().lower() in ['month', 'месяц']:
                                del row_data[key]
                        
                        # Добавляем определение месяца
                        if sheet_name in month_names:
                            row_data['month'] = sheet_name
                        else:
                            # Пробуем взять месяц из поля "Дата" или "Дата и время"
                            date_field = None
                            for k in row_data:
                                if k.strip().lower() in ['дата', 'дата и время', 'date', 'datetime']:
                                    date_field = row_data[k]
                                    break
                            month_num = get_month_from_date_string(date_field)
                            row_data['month'] = month_names[month_num - 1] if month_num and 1 <= month_num <= 12 else None

                        if row_data['month'] is not None:
                            # Добавляем источник и filename
                            if sources and sources.strip():
                                row_data['источник'] = sources
                            else:
                                row_data['источник'] = original_filename.replace('.xlsx', '').replace('.xls', '')
                            row_data['filename'] = original_filename
                            
                            # Добавляем уникальный id
                            next_id = len(all_users_data) + len(all_entries) + 1
                            row_data['id'] = next_id
                            
                            all_entries.append(row_data)
                            
            except Exception as e:
                print(f"ERROR: Ошибка обработки файла {file.filename}: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Ошибка обработки файла {file.filename}: {str(e)}")

        if not all_entries:
            print("DEBUG: Нет валидных данных для сохранения")
            return {"status": "no_valid_data"}

        # Добавляем все записи в глобальное хранилище
        all_users_data.extend(all_entries)
        print(f"DEBUG: Успешно добавлено {len(all_entries)} записей в all_users_data")
        return {"status": "success", "saved": len(all_entries)}
        
    except Exception as e:
        print(f"ERROR: Общая ошибка в upload_excel_2025: {str(e)}")
        print(f"ERROR: Тип ошибки: {type(e)}")
        import traceback
        print(f"ERROR: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки файлов: {str(e)}")

@router.get("/count_users_excel_2025", tags=["Excel"])
def count_users_excel_2025():
    return {"all_users": len(all_users_data)}

@router.get("/all_users_excel_2025", tags=["Excel"])
def all_users_excel_2025():
    result = []
    for row in all_users_data:
        gender = row.get("gender")
        if not gender:
            fio = row.get("ФИО")
            gender = guess_gender_by_fio(fio)
        
        # Оставляем язык как есть, не определяем автоматически
        language = row.get("язык")
        if not language:
            language = "неизвестно"
        
        row_with_data = dict(row)
        row_with_data["gender"] = gender
        row_with_data["язык"] = language
        
        # Добавляем телефон, даже если его нет
        if "телефон" not in row_with_data:
            row_with_data["телефон"] = None
            
        # Формируем новый словарь: все поля кроме 'источник', потом 'источник'
        ordered = {k: v for k, v in row_with_data.items() if k != "источник"}
        if "источник" in row_with_data:
            ordered["источник"] = row_with_data["источник"]
        result.append(ordered)
    return result

def parse_date_safe(date_str):
    """Безопасное парсирование даты из различных форматов"""
    if not date_str:
        return None
    
    date_str = str(date_str).strip()
    
    # Формат DD.MM.YYYY
    if '.' in date_str and len(date_str.split('.')) == 3:
        try:
            return datetime.strptime(date_str, "%d.%m.%Y")
        except:
            pass
    
    # Формат DD/MM/YYYY
    if '/' in date_str and len(date_str.split('/')) == 3:
        try:
            return datetime.strptime(date_str, "%d/%m/%Y")
        except:
            pass
    
    # ISO формат (YYYY-MM-DD)
    if '-' in date_str and len(date_str.split('-')) == 3:
        try:
            return datetime.fromisoformat(date_str.split('T')[0])
        except:
            pass
    
    # Если ничего не подошло, возвращаем None
    return None

@router.get("/filter_users_by_date_excel_2025", tags=["Excel"])
def filter_users_by_date_excel_2025(
    date_from: str = Query(..., description="Начальная дата в формате DD.MM.YYYY"),
    date_to: str = Query(..., description="Конечная дата в формате DD.MM.YYYY")
):
    filtered = []
    dt_from = parse_date_safe(date_from)
    dt_to = parse_date_safe(date_to)
    if dt_from and dt_to:
        for row in all_users_data:
            date_val = row.get("Дата")
            if date_val:
                dt = parse_date_safe(date_val)
                if dt and dt_from <= dt <= dt_to:
                    filtered.append(row)
    return filtered

@router.get("/filter_users_by_count_excel_2025", tags=["Excel"])
def filter_users_by_count_excel_2025(
    type: str = Query(..., regex="^(single|periodic|frequent)$", description="single/periodic/frequent"),
    by: str = Query("ФИО", description="Ключ для группировки: 'ФИО' или 'E-mail'")
):
    counter = defaultdict(list)
    for row in all_users_data:
        key = row.get(by)
        if key:
            counter[key].append(row)
    if type == "single":
        result = [rows[0] for rows in counter.values() if len(rows) == 1]
    elif type == "periodic":
        result = [row for rows in counter.values() if 2 <= len(rows) <= 4 for row in rows]
    elif type == "frequent":
        result = [row for rows in counter.values() if len(rows) >= 5 for row in rows]
    else:
        result = []
    return result

@router.get("/user_analytics_excel_2025", tags=["Excel"])
def user_analytics_excel_2025(
    key: str = Query(..., description="Значение для поиска (ФИО или E-mail)"),
    by: str = Query("ФИО", description="Поле для поиска: 'ФИО' или 'E-mail'")
):
    user_rows = [row for row in all_users_data if row.get(by) == key]
    if not user_rows:
        return {"error": "User not found"}

    # Считаем суммы
    amounts = []
    dates = []
    months = []
    for row in user_rows:
        # Сумма
        try:
            if row.get("Сумма") is not None:
                amounts.append(float(row["Сумма"]))
        except Exception:
            pass
        # Дата
        date_val = row.get("Дата")
        if date_val:
            dt = parse_date_safe(date_val)
            if dt:
                dates.append(dt)
                months.append(dt.strftime("%Y-%m"))

    gender = guess_gender_by_fio(key) if by == "ФИО" else "неизвестно"

    stats = {
        "total_count": len(user_rows),
        "total_amount": sum(amounts) if amounts else 0,
        "average_amount": sum(amounts)/len(amounts) if amounts else 0,
        "min_amount": min(amounts) if amounts else None,
        "max_amount": max(amounts) if amounts else None,
        "first_transaction": min(dates).strftime("%Y-%m-%d") if dates else None,
        "last_transaction": max(dates).strftime("%Y-%m-%d") if dates else None,
        "most_frequent_month": Counter(months).most_common(1)[0][0] if months else None
    }
    return {
        "user_info": {by: key, "gender": gender},
        "stats": stats,
        "transactions": user_rows
    }

def guess_gender_by_fio(fio: str) -> str:
    if not fio or not isinstance(fio, str):
        return "неизвестно"
    fio_parts = fio.strip().split()
    if len(fio_parts) < 2:
        return "неизвестно"
    surname = fio_parts[0].lower()
    otchestvo = fio_parts[-1].lower() if len(fio_parts) > 2 else ""
    # Женские окончания
    if surname.endswith(("ова", "ева", "ина", "ая", "ская", "цкая")) or \
       otchestvo.endswith(("овна", "евна", "ична", "қызы", "кызы", "гызи", "гулы")):
        return "женщина"
    # Мужские окончания
    if surname.endswith(("ов", "ев", "ин", "ский", "цкий")) or \
       otchestvo.endswith(("ович", "евич", "ич", "улы", "оглы")):
        return "мужчина"
    return "неизвестно"

def guess_language_by_fio(fio: str) -> str:
    if not fio or not isinstance(fio, str):
        return "неизвестно"
    fio_lower = fio.lower()
    kazakh_letters = set("әөүқғңұhі")
    kazakh_endings = ("улы", "қызы", "кызы", "оглы", "гулы", "бек", "хан", "бай", "жан", "гали", "мырза", "нур")
    russian_endings = ("ов", "ова", "ев", "ева", "ин", "ина", "ский", "ская", "цкий", "цкая", "ович", "овна", "евич", "евна", "ич", "ична")
    # Казахские буквы
    if any(ch in kazakh_letters for ch in fio_lower):
        return "казахский"
    # Казахские окончания
    if any(fio_lower.endswith(end) for end in kazakh_endings):
        return "казахский"
    # Русские окончания
    if any(fio_lower.endswith(end) for end in russian_endings):
        return "русский"
    return "неизвестно"

@router.get("/users_with_unknown_gender_excel_2025", tags=["Excel"])
def users_with_unknown_gender_excel_2025():
    result = []
    for row in all_users_data:
        fio = row.get("ФИО")
        gender = guess_gender_by_fio(fio)
        if gender == "неизвестно":
            row_with_gender = dict(row)
            row_with_gender["gender"] = gender
            result.append(row_with_gender)
    return result

@router.post("/set_user_phone_excel_2025", tags=["Excel"])
def set_user_phone_excel_2025(
    id: int = Body(..., description="ID пользователя"),
    phone: str = Body(..., description="Новый телефон")
):
    updated = 0
    for row in all_users_data:
        if row.get("id") == id:
            row["телефон"] = phone
            updated += 1
    return {"updated": updated}

@router.post("/set_user_language_excel_2025", tags=["Excel"])
def set_user_language_excel_2025(
    id: int = Body(..., description="ID пользователя"),
    language: str = Body(..., description="Новый язык")
):
    updated = 0
    for row in all_users_data:
        if row.get("id") == id:
            row["язык"] = language
            updated += 1
    return {"updated": updated}

@router.post("/set_user_gender_excel_2025", tags=["Excel"])
def set_user_gender_excel_2025(
    id: int = Body(..., description="ID пользователя"),
    gender: str = Body(..., description="Новый пол: 'мужчина', 'женщина', 'неизвестно'")
):
    updated = 0
    for row in all_users_data:
        if row.get("id") == id:
            row["gender"] = gender
            updated += 1
    return {"updated": updated}

@router.get("/filter_users_by_gender_excel_2025", tags=["Excel"])
def filter_users_by_gender_excel_2025(
    gender: str = Query(..., description="Гендер: мужчина/женщина/неизвестно (регистр и варианты не важны)")
):
    gender_norm = gender.strip().lower()
    gender_map = {
        "мужчина": "мужчина",
        "женщина": "женщина",
        "неизвестно": "неизвестно",
        "муж": "мужчина",
        "жен": "женщина",
        "male": "мужчина",
        "female": "женщина"
    }
    gender_norm = gender_map.get(gender_norm, gender_norm)
    result = []
    for row in all_users_data:
        g = row.get("gender")
        if not g:
            fio = row.get("ФИО")
            g = guess_gender_by_fio(fio)
        if g and g.strip().lower() == gender_norm:
            result.append(row)
    return result

@router.get("/filter_users_by_language_excel_2025", tags=["Excel"])
def filter_users_by_language_excel_2025(
    language: str = Query(..., description="Язык: казахский/русский/английский/другой (регистр и варианты не важны)")
):
    lang_norm = language.strip().lower()
    lang_map = {
        "казахский": "казахский",
        "русский": "русский",
        "английский": "английский",
        "английский язык": "английский",
        "english": "английский",
        "другой": "другой",
        "other": "другой"
    }
    lang_norm = lang_map.get(lang_norm, lang_norm)
    result = []
    for row in all_users_data:
        l = row.get("язык")
        if not l or l == "неизвестно":
            fio = row.get("ФИО")
            l = guess_language_by_fio(fio)
        l_norm = l.strip().lower() if l else "неизвестно"
        if lang_norm == "другой":
            if l_norm not in ("казахский", "русский", "английский"):
                result.append(row)
        elif l_norm == lang_norm:
            result.append(row)
    return result

# --------- Расширенная функция фильтрации -------------------------
# Теперь параметры type / gender / language / source могут быть списками,
# чтобы поддерживать выбор нескольких значений одного поля
# (?type=single&type=frequent).

def apply_filters(
    data: list[dict],
    type: list[str] | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    amount_from: float | None = None,
    amount_to: float | None = None,
    gender: list[str] | None = None,
    language: list[str] | None = None,
    source: list[str] | None = None,
) -> list[dict]:
    filtered = data

    # 2. Фильтр по источнику (можно несколько значений)
    if source:
        source_set = {s.strip().lower() for s in source}
        filtered = [row for row in filtered if str(row.get("источник", "")).strip().lower() in source_set]

    # 3. Фильтр по типу донаций (single/periodic/frequent) — список значений
    if type:
        from collections import defaultdict
        accepted = {t.strip().lower() for t in type}
        valid = {"single", "periodic", "frequent"}
        if not accepted <= valid:
            raise HTTPException(status_code=400, detail="Unsupported type value")

        counter = defaultdict(list)
        for row in filtered:
            key = row.get("ФИО") or row.get("E-mail")  # группируем по ФИО/Email
            if key:
                counter[key].append(row)

        temp = []
        for rows in counter.values():
            cnt = len(rows)
            cls = (
                "single"   if cnt == 1 else
                "periodic" if 2 <= cnt <= 4 else
                "frequent"
            )
            if cls in accepted:
                temp.extend(rows)
        filtered = temp

    # 4. Фильтр по периоду (дата)
    if date_from and date_to:
        try:
            dt_from = parse_date_safe(date_from)
            dt_to = parse_date_safe(date_to)
            if dt_from and dt_to:
                temp = []
                for row in filtered:
                    date_val = row.get("Дата")
                    if date_val:
                        dt = parse_date_safe(date_val)
                        if dt and dt_from <= dt <= dt_to:
                            temp.append(row)
                filtered = temp
        except Exception:
            pass

    # 5. Фильтр по сумме (Сумма)
    if amount_from is not None or amount_to is not None:
        temp = []
        for row in filtered:
            try:
                amount = float(row.get("Сумма")) if row.get("Сумма") is not None else None
            except Exception:
                amount = None
            if amount is not None:
                if amount_from is not None and amount < amount_from:
                    continue
                if amount_to is not None and amount > amount_to:
                    continue
                temp.append(row)
        filtered = temp

    # 6. Фильтр по полу (может быть несколько значений)
    if gender:
        accepted_raw = gender
        gender_map_single = {
            "мужчина": "мужчина",
            "женщина": "женщина",
            "неизвестно": "неизвестно",
            "муж": "мужчина",
            "жен": "женщина",
            "male": "мужчина",
            "female": "женщина",
        }
        accepted = {gender_map_single.get(g.strip().lower(), g.strip().lower()) for g in accepted_raw}
        temp = []
        for row in filtered:
            g = row.get("gender")
            if not g:
                fio = row.get("ФИО")
                g = guess_gender_by_fio(fio)
            g_norm = g.strip().lower() if g else "неизвестно"
            if g_norm in accepted:
                temp.append(row)
        filtered = temp

    # 7. Фильтр по языку (список значений)
    if language:
        # Проверяем, есть ли пустая строка (опция "любой")
        has_any_option = any(lang.strip() == "" for lang in language)
        
        if has_any_option:
            # Если выбрано "любой", показываем все записи (включая "неизвестно")
            pass  # Не фильтруем по языку
        else:
            # Если выбраны конкретные языки, фильтруем только по ним
            lang_map_single = {
                "казахский": "казахский",
                "русский": "русский",
                "английский": "английский",
                "английский язык": "английский",
                "english": "английский",
                "другой": "другой",
                "other": "другой",
                "неизвестно": "неизвестно",
            }
            accepted_raw = language
            accepted = {lang_map_single.get(l.strip().lower(), l.strip().lower()) for l in accepted_raw}
            print(f"DEBUG: Принятые языки для фильтрации: {accepted}")

            temp = []
            for row in filtered:
                l = row.get("язык")
                if not l:
                    l = "неизвестно"
                
                # Обработка случая, когда язык может быть списком или строкой
                if isinstance(l, list):
                    # Если язык - это список, проверяем каждый элемент
                    languages = [str(lang).strip().lower() if lang else "неизвестно" for lang in l]
                else:
                    # Если язык - это строка, проверяем на наличие запятых (несколько языков)
                    l_str = str(l).strip().lower() if l else "неизвестно"
                    if "," in l_str:
                        # Разделяем по запятой и убираем пробелы
                        languages = [lang.strip() for lang in l_str.split(",")]
                    else:
                        languages = [l_str]
                
                # Отладочная информация
                print(f"DEBUG: Запись {row.get('ФИО', 'Unknown')} - исходный язык: '{l}', обработанные языки: {languages}, принятые: {accepted}")
                
                # Отладочная информация для первых нескольких записей
                if len(temp) < 5:  # Показываем только для первых 5 записей
                    print(f"DEBUG: Запись {row.get('ФИО', 'Unknown')} - исходный язык: '{l}', обработанные языки: {languages}")
                
                # Проверяем, есть ли хотя бы один язык в принятых
                should_add = False
                
                # Если выбраны конкретные языки, проверяем точное совпадение
                if len(accepted) > 1:
                    # Сортируем языки для сравнения (чтобы "русский, английский" и "английский, русский" считались одинаковыми)
                    sorted_languages = sorted(languages)
                    sorted_accepted = sorted(accepted)
                    
                    # Проверяем точное совпадение списков языков
                    if sorted_languages == sorted_accepted:
                        should_add = True
                else:
                    # Если выбран только один язык, проверяем его наличие
                    for l_norm in languages:
                        if "другой" in accepted:
                            if l_norm not in ("казахский", "русский", "английский", "неизвестно"):
                                should_add = True
                                break
                        if l_norm in accepted:
                            should_add = True
                            break
                
                if should_add:
                    temp.append(row)
            filtered = temp

    return filtered 

@router.get("/filter_users_excel_2025", tags=["Excel"])
def filter_users_excel_2025(
    type: list[str] | None = Query(None, description="Тип(ы) донаций: single/periodic/frequent"),
    date_from: str | None = Query(None, description="Начальная дата DD.MM.YYYY"),
    date_to: str | None = Query(None, description="Конечная дата DD.MM.YYYY"),
    amount_from: float | None = Query(None, description="Минимальная сумма (Сумма)"),
    amount_to: float | None = Query(None, description="Максимальная сумма (Сумма)"),
    gender: list[str] | None = Query(None, description="Пол(ы): мужчина/женщина/неизвестно"),
    language: list[str] | None = Query(None, description="Язык(и): казахский/русский/английский/другой"),
    source: list[str] | None = Query(None, description="Источник(и)"),
):
    return apply_filters(
        all_users_data,
        type,
        date_from,
        date_to,
        amount_from,
        amount_to,
        gender,
        language,
        source,
    )

@router.get("/export_users_excel_2025", tags=["Excel"])
def export_users_excel_2025(
    type: list[str] | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    amount_from: float | None = Query(None),
    amount_to: float | None = Query(None),
    gender: list[str] | None = Query(None),
    language: list[str] | None = Query(None),
    source: list[str] | None = Query(None),
):
    rows = apply_filters(
        all_users_data,
        type,
        date_from,
        date_to,
        amount_from,
        amount_to,
        gender,
        language,
        source,
    )

    if not rows:
        raise HTTPException(404, "Нет данных под выбранные фильтры")

    df = pd.DataFrame(rows)
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=filtered_users.xlsx"}
    )

@router.post("/add_user_excel_2025", tags=["Excel"])
def add_user_excel_2025(user: dict = Body(...)):
    global all_users_data
    # Корректно формируем id
    next_id = len(all_users_data) + 1 if all_users_data else 1
    user = dict(user)
    user["id"] = next_id
    # Добавляем телефон и язык, даже если их нет
    if "телефон" not in user:
        user["телефон"] = None
    if "язык" not in user:
        user["язык"] = None
    all_users_data.append(user)
    return user 

@router.put("/update_user_excel_2025", tags=["Excel"])
def update_user_excel_2025(
    id: int = Body(..., description="ID пользователя"),
    updates: dict = Body(..., description="Поля для обновления")
):
    for user in all_users_data:
        if user.get("id") == id:
            user.update(updates)
            return {"success": True, "user": user}
    raise HTTPException(status_code=404, detail="User not found") 

@router.get("/list_uploaded_istochniks", tags=["Excel"])
def list_uploaded_istochniks():
    # Группируем по названию файла
    filename_counts = {}
    for row in all_users_data:
        filename = row.get("filename")
        if filename:
            if filename not in filename_counts:
                filename_counts[filename] = {
                    "count": 0,
                    "источник": row.get("источник", "Неизвестно")
                }
            filename_counts[filename]["count"] += 1
    
    result = []
    for filename, data in filename_counts.items():
        result.append({
            "filename": filename,
            "источник": data["источник"],
            "count": data["count"]
        })
    return result

@router.post("/delete_by_istochnik", tags=["Excel"])
def delete_by_istochnik(filename: str = Body(..., embed=True)):
    global all_users_data
    before = len(all_users_data)
    all_users_data = [row for row in all_users_data if row.get("filename") != filename]
    after = len(all_users_data)
    return {"deleted": before - after}

@router.post("/reset_all_excel_2025", tags=["Excel"])
def reset_all_excel_2025():
    global all_users_data
    deleted = len(all_users_data)
    all_users_data = []
    return {"deleted": deleted} 