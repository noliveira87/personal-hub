import { useState, useEffect, useCallback, useMemo } from 'react';
import { Pencil, X, Loader2, Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { HealthPerson } from '@/features/health/lib/healthData';
import {
  AppointmentRow,
  CholesterolRow,
  HealthCategoryGroups,
  loadAppointments,
  loadCategoryGroups,
  loadCholesterolEntries,
  loadCategoryOrder,
  saveCategoryGroups,
  deleteCholesterolEntry,
  saveCholesterolEntry,
  saveCategoryOrder,
  upsertAppointment,
  deleteAppointment,
} from '@/features/health/lib/healthRecords';

// ── Internal display types ───────────────────────────────────────────────────
type Appointment = {
  id: string;
  date: string;     // DD/MM for display
  fullDate: string; // YYYY-MM-DD for storage
  clinic: string;
  doctor: string;
  note: string;
};

type DisplayRow = {
  label: string;
  byYear: Record<string, Appointment[]>;
};

type DraftAppt = {
  key: string;
  id?: string;       // undefined = not yet in DB
  date: string;      // DD/MM
  fullDate: string;  // YYYY-MM-DD
  clinic: string;
  doctor: string;
  note: string;
  toDelete?: boolean;
};

type EditState = {
  label: string;
  years: string[];
  yearData: Record<string, DraftAppt[]>;
};

type NewCategoryState = {
  mode: 'create' | 'add-to-existing';
  name: string;
  group: 'consultas' | 'exames';
  selectedCategory?: string; // for 'add-to-existing' mode
  entries: { key: string; date: string; clinic: string; doctor: string; note: string }[]; // YYYY-MM-DD format
};

type TimelineItem = {
  id: string;
  category: string;
  fullDate: string;
  date: string;
  clinic: string;
  doctor: string;
  note: string;
};

type DraftCholesterolRow = {
  key: string;
  id?: string;
  year: number;
  entryOrder: number;
  total: number | null;
  hdl: number | null;
  ldl: number | null;
  triglycerides: number | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
let _draftKey = 0;
function nextKey() { return `draft-${++_draftKey}`; }

function isoToDisplay(iso: string): string {
  const [, mm, dd] = iso.split('-');
  return `${dd}/${mm}`;
}

function groupAppointments(appts: AppointmentRow[]): DisplayRow[] {
  const byLabel: Record<string, Record<string, Appointment[]>> = {};

  appts.forEach((row) => {
    const year = row.date.substring(0, 4);
    if (!byLabel[row.category]) byLabel[row.category] = {};
    if (!byLabel[row.category][year]) byLabel[row.category][year] = [];
    byLabel[row.category][year].push({
      id: row.id,
      date: isoToDisplay(row.date),
      fullDate: row.date,
      clinic: row.clinic ?? '',
      doctor: row.doctor ?? '',
      note: row.note ?? '',
    });
  });

  // Sort ascending within each year
  Object.values(byLabel).forEach((byYear) =>
    Object.values(byYear).forEach((list) =>
      list.sort((a, b) => a.fullDate.localeCompare(b.fullDate)),
    ),
  );

  return Object.entries(byLabel)
    .sort((a, b) => a[0].localeCompare(b[0], 'pt-PT'))
    .map(([label, byYear]) => ({ label, byYear }));
}

function accentClass(person: HealthPerson) {
  return person === 'nuno'
    ? { badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' }
    : { badge: 'bg-rose-100 text-rose-800', dot: 'bg-rose-500' };
}

function totalLegend(value: number | null): { label: string; color: string } {
  if (value == null) return { label: '-', color: 'text-muted-foreground' };
  if (value < 200) return { label: 'Desejável', color: 'text-emerald-600' };
  if (value < 240) return { label: 'Limite elevado', color: 'text-red-600' };
  return { label: 'Elevado', color: 'text-red-600' };
}

function hdlLegend(value: number | null): { label: string; color: string } {
  if (value == null) return { label: '-', color: 'text-muted-foreground' };
  if (value < 40) return { label: 'Risco elevado', color: 'text-red-600' };
  if (value <= 55) return { label: 'Risco intermédio', color: 'text-amber-600' };
  return { label: 'Risco reduzido', color: 'text-emerald-600' };
}

function ldlLegend(value: number | null): { label: string; color: string } {
  if (value == null) return { label: '-', color: 'text-muted-foreground' };
  if (value < 100) return { label: 'Ótimo', color: 'text-emerald-600' };
  if (value < 130) return { label: 'Quase desejável', color: 'text-emerald-600' };
  if (value < 160) return { label: 'Limite elevado', color: 'text-red-600' };
  if (value < 190) return { label: 'Risco elevado', color: 'text-red-600' };
  return { label: 'Muito elevado', color: 'text-red-600' };
}

function triglyceridesLegend(value: number | null): { label: string; color: string } {
  if (value == null) return { label: '-', color: 'text-muted-foreground' };
  if (value < 150) return { label: 'Normal', color: 'text-blue-600' };
  if (value < 200) return { label: 'Limite elevado', color: 'text-amber-600' };
  if (value < 500) return { label: 'Elevado', color: 'text-red-600' };
  return { label: 'Muito elevado', color: 'text-red-600' };
}

function ratioLegend(total: number | null, hdl: number | null): { value: string; label: string; color: string } {
  if (total == null || hdl == null || hdl <= 0) return { value: '-', label: '-', color: 'text-muted-foreground' };
  const ratio = total / hdl;
  const rounded = ratio.toFixed(2);
  if (ratio < 3.5) return { value: rounded, label: 'Ótimo', color: 'text-emerald-600' };
  if (ratio <= 5) return { value: rounded, label: 'Intermédio', color: 'text-amber-600' };
  return { value: rounded, label: 'Elevado', color: 'text-red-600' };
}

function parseNullableInt(value: string): number | null {
  if (value.trim() === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.trunc(num);
}

function sortDraftCholesterolRows(rows: DraftCholesterolRow[]): DraftCholesterolRow[] {
  return [...rows].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return a.entryOrder - b.entryOrder;
  });
}

// ── Component ────────────────────────────────────────────────────────────────
export default function HealthTimelineTable({ person: propPerson, openNewCategory: propOpenNewCategory, onCloseNewCategory }: { person: HealthPerson; openNewCategory: boolean; onCloseNewCategory: () => void }) {
  const [displayRows, setDisplayRows] = useState<DisplayRow[]>([]);
  const [cholesterolRows, setCholesterolRows] = useState<CholesterolRow[]>([]);
  const [showAllCholesterolYears, setShowAllCholesterolYears] = useState(false);
  const [isEditingCholesterol, setIsEditingCholesterol] = useState(false);
  const [cholesterolDraftRows, setCholesterolDraftRows] = useState<DraftCholesterolRow[]>([]);
  const [deletedCholesterolIds, setDeletedCholesterolIds] = useState<string[]>([]);
  const [savingCholesterol, setSavingCholesterol] = useState(false);
  const [visibleYearCount, setVisibleYearCount] = useState(4);
  const [visibleCategoryCount, setVisibleCategoryCount] = useState(4);
  const [categoryItemCounts, setCategoryItemCounts] = useState<Record<string, number>>({});
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<HealthCategoryGroups>({ consultas: [], exames: [] });
  const [loading, setLoading] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState<NewCategoryState | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);

  const accent = accentClass(propPerson);
  const cholesterolSourceRows = isEditingCholesterol
    ? cholesterolDraftRows.map((row) => ({
        id: row.id ?? row.key,
        person: propPerson,
        year: row.year,
        entryOrder: row.entryOrder,
        total: row.total,
        hdl: row.hdl,
        ldl: row.ldl,
        triglycerides: row.triglycerides,
      }))
    : cholesterolRows;

  const totalCholesterolYears = new Set(cholesterolSourceRows.map((row) => row.year)).size;
  const hasHiddenCholesterolYears = totalCholesterolYears > 3;
  const visibleCholesterolRows = showAllCholesterolYears
    ? cholesterolSourceRows
    : (() => {
        const latestYears = Array.from(new Set(cholesterolSourceRows.map((row) => row.year))).slice(0, 3);
        const allowed = new Set(latestYears);
        return cholesterolSourceRows.filter((row) => allowed.has(row.year));
      })();

  const latestCholesterolRow = useMemo(() => {
    if (cholesterolSourceRows.length === 0) return null;

    return [...cholesterolSourceRows].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.entryOrder - a.entryOrder;
    })[0];
  }, [cholesterolSourceRows]);

  const rowsByLabel = useMemo(
    () => new Map(displayRows.map((row) => [row.label, row])),
    [displayRows],
  );

  const timelineByYear = useMemo(() => {
    const timelineItems: TimelineItem[] = [];

    displayRows.forEach((row) => {
      Object.values(row.byYear).forEach((appts) => {
        appts.forEach((appt) => {
          timelineItems.push({
            id: appt.id,
            category: row.label,
            fullDate: appt.fullDate,
            date: appt.date,
            clinic: appt.clinic,
            doctor: appt.doctor,
            note: appt.note,
          });
        });
      });
    });

    timelineItems.sort((a, b) => b.fullDate.localeCompare(a.fullDate) || a.category.localeCompare(b.category));

    return timelineItems.reduce<Record<string, TimelineItem[]>>((acc, item) => {
      const year = item.fullDate.slice(0, 4);
      if (!acc[year]) acc[year] = [];
      acc[year].push(item);
      return acc;
    }, {});
  }, [displayRows]);

  const timelineYears = useMemo(
    () => Object.keys(timelineByYear).sort((a, b) => Number(b) - Number(a)),
    [timelineByYear],
  );
  const visibleTimelineYears = useMemo(
    () => timelineYears.slice(0, visibleYearCount),
    [timelineYears, visibleYearCount],
  );
  const remainingTimelineYears = Math.max(0, timelineYears.length - visibleTimelineYears.length);
  const nextYearsToLoad = Math.min(4, remainingTimelineYears);
  const visibleCategoryCards = useMemo(() => {
    const byCategory: Record<string, Array<TimelineItem & { year: string }>> = {};

    // Use ALL years to get all categories, not just visible years
    Object.entries(timelineByYear).forEach(([year, items]) => {
      items.forEach((item) => {
        if (!byCategory[item.category]) byCategory[item.category] = [];
        byCategory[item.category].push({ ...item, year });
      });
    });

    return Object.entries(byCategory)
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => b.fullDate.localeCompare(a.fullDate)),
      }))
      .sort((a, b) => {
        const aLatest = a.items[0]?.fullDate ?? '';
        const bLatest = b.items[0]?.fullDate ?? '';
        return bLatest.localeCompare(aLatest) || a.category.localeCompare(b.category, 'pt-PT');
      });
  }, [timelineByYear]);

  const orderedVisibleCategoryCards = useMemo(() => {
    if (visibleCategoryCards.length === 0) return [];

    const cardsMap = new Map(visibleCategoryCards.map((card) => [card.category, card]));
    const uniqueOrder = categoryOrder.filter((category, index, arr) => arr.indexOf(category) === index);
    const orderedFromState = uniqueOrder.map((category) => ({
      category,
      items: cardsMap.get(category)?.items ?? [],
    }));
    const missing = visibleCategoryCards.filter((card) => !uniqueOrder.includes(card.category));

    return [...orderedFromState, ...missing];
  }, [visibleCategoryCards, categoryOrder]);

  const limitedCategoryCards = useMemo(() => {
    return orderedVisibleCategoryCards.slice(0, visibleCategoryCount);
  }, [orderedVisibleCategoryCards, visibleCategoryCount]);

  const groupedLimitedCategoryCards = useMemo(() => {
    const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-PT');
    const consultasSet = new Set(categoryGroups.consultas.map(normalize));
    const examesSet = new Set(categoryGroups.exames.map(normalize));

    const grouped: {
      consultas: Array<{ category: string; items: Array<TimelineItem & { year: string }> }>;
      exames: Array<{ category: string; items: Array<TimelineItem & { year: string }> }>;
      semGrupo: Array<{ category: string; items: Array<TimelineItem & { year: string }> }>;
    } = {
      consultas: [],
      exames: [],
      semGrupo: [],
    };

    limitedCategoryCards.forEach((card) => {
      const key = normalize(card.category);
      if (consultasSet.has(key)) {
        grouped.consultas.push(card);
      } else if (examesSet.has(key)) {
        grouped.exames.push(card);
      } else {
        grouped.semGrupo.push(card);
      }
    });

    return grouped;
  }, [limitedCategoryCards, categoryGroups]);

  const remainingCategoryCount = Math.max(0, orderedVisibleCategoryCards.length - limitedCategoryCards.length);
  const nextCategoriesToLoad = Math.min(4, remainingCategoryCount);

  const loadData = useCallback(async (p: HealthPerson) => {
    setLoading(true);
    try {
      const [appts, chol] = await Promise.all([
        loadAppointments(p),
        loadCholesterolEntries(p),
      ]);
      setDisplayRows(groupAppointments(appts));
      setCholesterolRows(chol);
    } catch {
      setDisplayRows([]);
      setCholesterolRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(propPerson); }, [propPerson, loadData]);

  useEffect(() => {
    // Load saved category order when person changes
    const loadSettings = async () => {
      try {
        const [savedOrder, savedGroups] = await Promise.all([
          loadCategoryOrder(propPerson),
          loadCategoryGroups(propPerson),
        ]);
        setCategoryOrder(savedOrder.filter((category, index, arr) => arr.indexOf(category) === index));
        setCategoryGroups(savedGroups);
      } catch (err) {
        console.warn('Failed to load health category settings:', err);
      }
    };
    loadSettings();
    setVisibleYearCount(4);
    setVisibleCategoryCount(4);
    setCategoryItemCounts({});
    setIsEditingCholesterol(false);
    setCholesterolDraftRows([]);
    setDeletedCholesterolIds([]);
  }, [propPerson]);

  useEffect(() => {
    if (timelineYears.length < visibleYearCount) {
      setVisibleYearCount(Math.max(4, timelineYears.length));
    }
  }, [timelineYears.length, visibleYearCount]);

  useEffect(() => {
    if (orderedVisibleCategoryCards.length < visibleCategoryCount) {
      setVisibleCategoryCount(Math.max(4, orderedVisibleCategoryCards.length));
    }
  }, [orderedVisibleCategoryCards.length, visibleCategoryCount]);

  useEffect(() => {
    setCategoryOrder((prev) => {
      const uniquePrev = prev.filter((category, index, arr) => arr.indexOf(category) === index);
      const currentCategories = visibleCategoryCards.map((card) => card.category);
      const added = currentCategories.filter((category) => !uniquePrev.includes(category));
      const next = [...uniquePrev, ...added];

      if (next.length === uniquePrev.length && next.every((item, idx) => item === uniquePrev[idx])) {
        return prev;
      }
      return next;
    });
  }, [visibleCategoryCards]);

  // Debounced save of category order to database
  useEffect(() => {
    const saveOrder = async () => {
      if (categoryOrder.length === 0) return; // Don't save empty order

      setIsSavingOrder(true);
      try {
        await saveCategoryOrder(propPerson, categoryOrder);
      } catch (err) {
        console.error('Failed to save category order:', err);
      } finally {
        setIsSavingOrder(false);
      }
    };

    const timer = setTimeout(saveOrder, 500); // Debounce 500ms
    return () => clearTimeout(timer);
  }, [categoryOrder, propPerson]);

  // Sync newCategory state with propOpenNewCategory
  useEffect(() => {
    if (propOpenNewCategory && !newCategory) {
      // Check if we already have any categories
      const hasExistingCategories = displayRows.some(row => 
        Object.values(row.byYear).flat().length > 0
      );
      
      setNewCategory({
        mode: hasExistingCategories ? 'add-to-existing' : 'create',
        name: '',
        group: 'consultas',
        selectedCategory: undefined,
        entries: [{ key: nextKey(), date: '', clinic: '', doctor: '', note: '' }] 
      });
    }
  }, [propOpenNewCategory, newCategory, displayRows]);

  function openEdit(row: DisplayRow) {
    // Only show years with actual appointments
    const allYears = Object.keys(row.byYear)
      .filter((y) => (row.byYear[y] ?? []).length > 0)
      .sort((a, b) => Number(b) - Number(a));

    const yearData: Record<string, DraftAppt[]> = {};
    allYears.forEach((year) => {
      yearData[year] = (row.byYear[year] ?? []).map((a) => ({
        key: a.id,
        id: a.id,
        date: a.date,
        fullDate: a.fullDate,
        clinic: a.clinic,
        doctor: a.doctor,
        note: a.note,
      }));
    });
    setEditing({ label: row.label, years: allYears, yearData });
  }

  function addDate(year: string, isoDate: string) {
    const [, mm, dd] = isoDate.split('-');
    const display = `${dd}/${mm}`;
    setEditing((prev) => {
      if (!prev) return prev;
      const existing = prev.yearData[year] ?? [];
      // Prevent duplicate
      if (existing.some((d) => d.fullDate === isoDate && !d.toDelete)) return prev;
      return {
        ...prev,
        yearData: {
          ...prev.yearData,
          [year]: [...existing, { key: nextKey(), date: display, fullDate: isoDate, clinic: '', doctor: '', note: '' }],
        },
      };
    });
  }

  function removeAppt(year: string, key: string) {
    setEditing((prev) => {
      if (!prev) return prev;
      const updated = prev.yearData[year].map((d) =>
        d.key === key ? { ...d, toDelete: true } : d,
      );
      return { ...prev, yearData: { ...prev.yearData, [year]: updated } };
    });
  }

  function updateNote(year: string, key: string, note: string) {
    setEditing((prev) => {
      if (!prev) return prev;
      const updated = prev.yearData[year].map((d) => (d.key === key ? { ...d, note } : d));
      return { ...prev, yearData: { ...prev.yearData, [year]: updated } };
    });
  }

  function updateClinic(year: string, key: string, clinic: string) {
    setEditing((prev) => {
      if (!prev) return prev;
      const updated = prev.yearData[year].map((d) => (d.key === key ? { ...d, clinic } : d));
      return { ...prev, yearData: { ...prev.yearData, [year]: updated } };
    });
  }

  function updateDoctor(year: string, key: string, doctor: string) {
    setEditing((prev) => {
      if (!prev) return prev;
      const updated = prev.yearData[year].map((d) => (d.key === key ? { ...d, doctor } : d));
      return { ...prev, yearData: { ...prev.yearData, [year]: updated } };
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const deleteIds: string[] = [];
      const toUpsert: Array<{
        person: HealthPerson;
        category: string;
        date: string;
        clinic: string | null;
        doctor: string | null;
        note: string | null;
      }> = [];

      editing.years.forEach((year) => {
        (editing.yearData[year] ?? []).forEach((draft) => {
          if (draft.toDelete) {
            if (draft.id) deleteIds.push(draft.id);
          } else {
            toUpsert.push({
              person: propPerson,
              category: editing.label,
              date: draft.fullDate,
              clinic: draft.clinic.trim() || null,
              doctor: draft.doctor.trim() || null,
              note: draft.note.trim() || null,
            });
          }
        });
      });

      if (deleteIds.length > 0 || toUpsert.length > 0) {
        await Promise.all([
          ...deleteIds.map((id) => deleteAppointment(id)),
          ...toUpsert.map((u) => upsertAppointment(u)),
        ]);

        await loadData(propPerson);
      }
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  function closeNewCategory() {
    setNewCategory(null);
    onCloseNewCategory();
  }

  function addEntryToNew() {
    setNewCategory((prev) =>
      prev ? { ...prev, entries: [...prev.entries, { key: nextKey(), date: '', clinic: '', doctor: '', note: '' }] } : prev,
    );
  }

  function removeEntryFromNew(key: string) {
    setNewCategory((prev) =>
      prev ? { ...prev, entries: prev.entries.filter((e) => e.key !== key) } : prev,
    );
  }

  function updateNewEntry(
    key: string,
    field: 'date' | 'clinic' | 'doctor' | 'note',
    value: string,
  ) {
    setNewCategory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: prev.entries.map((e) => (e.key === key ? { ...e, [field]: value } : e)),
      };
    });
  }

  function updateNewCategoryName(name: string) {
    setNewCategory((prev) => (prev ? { ...prev, name } : prev));
  }

  function updateNewCategoryMode(mode: 'create' | 'add-to-existing') {
    setNewCategory((prev) => (prev ? { ...prev, mode, selectedCategory: undefined } : prev));
  }

  function updateNewCategoryGroup(group: 'consultas' | 'exames') {
    setNewCategory((prev) => (prev ? { ...prev, group } : prev));
  }

  function updateSelectedCategory(categoryLabel: string) {
    setNewCategory((prev) => (prev ? { ...prev, selectedCategory: categoryLabel } : prev));
  }

  function moveCategory(category: string, direction: 'up' | 'down') {
    setCategoryOrder((prev) => {
      const source = prev.length > 0 ? [...prev] : visibleCategoryCards.map((card) => card.category);
      const index = source.indexOf(category);
      if (index === -1) return source;

      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= source.length) return source;

      [source[index], source[target]] = [source[target], source[index]];
      return source;
    });
  }

  async function saveNewCategory() {
    if (!newCategory) return;

    const validEntries = newCategory.entries.filter((e) => e.date.trim());
    if (validEntries.length === 0) {
      return;
    }

    const categoryLabel = newCategory.mode === 'create' 
      ? newCategory.name.trim()
      : newCategory.selectedCategory;

    if (!categoryLabel) {
      return;
    }

    setSavingCategory(true);
    try {
      await Promise.all(
        validEntries.map((entry) =>
          upsertAppointment({
            person: propPerson,
            category: categoryLabel,
            date: entry.date, // already YYYY-MM-DD from date input
            clinic: entry.clinic.trim() || null,
            doctor: entry.doctor.trim() || null,
            note: entry.note.trim() || null,
          }),
        ),
      );

      if (newCategory.mode === 'create') {
        const normalized = (value: string) => value.trim().toLocaleLowerCase('pt-PT');
        const label = categoryLabel.trim();
        const nextGroups: HealthCategoryGroups = {
          consultas: categoryGroups.consultas.filter((item) => normalized(item) !== normalized(label)),
          exames: categoryGroups.exames.filter((item) => normalized(item) !== normalized(label)),
        };

        if (newCategory.group === 'consultas') {
          nextGroups.consultas = [...nextGroups.consultas, label];
        } else {
          nextGroups.exames = [...nextGroups.exames, label];
        }

        setCategoryGroups(nextGroups);
        await saveCategoryGroups(propPerson, nextGroups);
      }

      await loadData(propPerson);
      closeNewCategory();
    } finally {
      setSavingCategory(false);
    }
  }

  function startCholesterolEdit() {
    const draft = sortDraftCholesterolRows(
      cholesterolRows.map((row) => ({
        key: row.id,
        id: row.id,
        year: row.year,
        entryOrder: row.entryOrder,
        total: row.total,
        hdl: row.hdl,
        ldl: row.ldl,
        triglycerides: row.triglycerides,
      })),
    );

    setCholesterolDraftRows(draft);
    setDeletedCholesterolIds([]);
    setShowAllCholesterolYears(true);
    setIsEditingCholesterol(true);
  }

  function cancelCholesterolEdit() {
    setIsEditingCholesterol(false);
    setCholesterolDraftRows([]);
    setDeletedCholesterolIds([]);
  }

  function removeDraftCholesterolEntry(key: string) {
    setCholesterolDraftRows((prev) => {
      const found = prev.find((row) => row.key === key);
      if (found?.id) {
        setDeletedCholesterolIds((ids) => (ids.includes(found.id!) ? ids : [...ids, found.id!]));
      }

      return prev.filter((row) => row.key !== key);
    });
  }

  function updateDraftCholesterolField(
    key: string,
    field: 'year' | 'entryOrder' | 'total' | 'hdl' | 'ldl' | 'triglycerides',
    value: string,
  ) {
    setCholesterolDraftRows((prev) => {
      const next = prev.map((row) => {
        if (row.key !== key) return row;

        if (field === 'year') {
          return { ...row, year: Math.max(2000, Number(value) || row.year) };
        }

        if (field === 'entryOrder') {
          return { ...row, entryOrder: Math.max(1, Number(value) || row.entryOrder) };
        }

        return { ...row, [field]: parseNullableInt(value) };
      });

      return sortDraftCholesterolRows(next);
    });
  }

  function addDraftCholesterolEntry() {
    const newYear = cholesterolDraftRows.length > 0
      ? Math.max(...cholesterolDraftRows.map((row) => row.year))
      : new Date().getFullYear();
    const nextEntryOrder = cholesterolDraftRows.filter((row) => row.year === newYear).length + 1;

    setCholesterolDraftRows((prev) =>
      sortDraftCholesterolRows([
        ...prev,
        {
          key: nextKey(),
          year: newYear,
          entryOrder: nextEntryOrder,
          total: null,
          hdl: null,
          ldl: null,
          triglycerides: null,
        },
      ]),
    );
  }

  async function saveCholesterolEdits() {
    setSavingCholesterol(true);
    try {
      await Promise.all(
        [
          ...deletedCholesterolIds.map((id) => deleteCholesterolEntry(id)),
          ...cholesterolDraftRows.map((row) =>
            saveCholesterolEntry({
              id: row.id,
              person: propPerson,
              year: row.year,
              entryOrder: row.entryOrder,
              total: row.total,
              hdl: row.hdl,
              ldl: row.ldl,
              triglycerides: row.triglycerides,
            }),
          ),
        ],
      );

      await loadData(propPerson);
      setIsEditingCholesterol(false);
      setCholesterolDraftRows([]);
      setDeletedCholesterolIds([]);
    } finally {
      setSavingCholesterol(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Removed header - now in AppSectionHeader */}

      {/* Appointment cards */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {timelineYears.length === 0 ? (
            <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Sem registos</div>
          ) : (
            <>
              {[
                { key: 'consultas', title: 'Consultas', cards: groupedLimitedCategoryCards.consultas },
                { key: 'exames', title: 'Exames', cards: groupedLimitedCategoryCards.exames },
                { key: 'sem-grupo', title: 'Sem grupo geral', cards: groupedLimitedCategoryCards.semGrupo },
              ]
                .filter((section) => section.cards.length > 0)
                .map((section) => (
                  <div key={section.key} className="space-y-3">
                    <div className="px-1">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</h3>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {section.cards.map(({ category, items }) => {
                  const categoryRow = rowsByLabel.get(category);
                  const allCategoriesIndex = orderedVisibleCategoryCards.findIndex(c => c.category === category);
                  const canMoveUp = allCategoriesIndex > 0;
                  const canMoveDown = allCategoriesIndex < orderedVisibleCategoryCards.length - 1;

                  return (
                    <section key={category} className="rounded-xl border bg-card">
                      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
                        <h3 className="text-sm font-semibold truncate">{category}</h3>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">{items.length} registos</span>
                          <button
                            type="button"
                            onClick={() => moveCategory(category, 'up')}
                            disabled={!canMoveUp}
                            className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Mover categoria para cima"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCategory(category, 'down')}
                            disabled={!canMoveDown}
                            className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Mover categoria para baixo"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-2 space-y-1.5">
                        {(() => {
                          const visibleCount = categoryItemCounts[category] ?? 4;
                          const visibleItems = items.slice(0, visibleCount);
                          const remainingItems = Math.max(0, items.length - visibleCount);
                          const itemsByYear = visibleItems.reduce<Record<string, typeof visibleItems>>((acc, item) => {
                            if (!acc[item.year]) acc[item.year] = [];
                            acc[item.year].push(item);
                            return acc;
                          }, {});
                          const yearGroups = Object.entries(itemsByYear).sort((a, b) => Number(b[0]) - Number(a[0]));

                          return (
                            <>
                              {yearGroups.map(([year, yearItems]) => (
                                <section key={`${category}-${year}`} className="rounded-md border bg-background/60 px-2.5 py-2">
                                  {(() => {
                                    const hasDetails = yearItems.some((item) => item.note || item.clinic || item.doctor);

                                    if (!hasDetails) {
                                      return (
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex min-w-0 flex-1 items-start gap-3">
                                            <span className="shrink-0 text-base font-bold leading-none text-foreground pt-1">
                                              {year}
                                            </span>

                                            <div className="min-w-0 flex flex-wrap gap-2">
                                              {yearItems.map((item) => (
                                                <article key={item.id} className="flex items-start gap-2 py-0.5">
                                                  <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${accent.badge}`}>
                                                    {item.date}
                                                  </span>
                                                </article>
                                              ))}
                                            </div>
                                          </div>

                                          {categoryRow && (
                                            <button
                                              onClick={() => openEdit(categoryRow)}
                                              className="opacity-60 hover:opacity-100 shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                              title="Editar categoria"
                                            >
                                              <Pencil className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                          <span className="shrink-0 text-base font-bold leading-none text-foreground pt-0.5">
                                            {year}
                                          </span>

                                          {categoryRow && (
                                            <button
                                              onClick={() => openEdit(categoryRow)}
                                              className="opacity-60 hover:opacity-100 shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                              title="Editar categoria"
                                            >
                                              <Pencil className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>

                                        <div className="space-y-1.5">
                                          {yearItems.map((item) => (
                                            <article key={item.id} className="flex items-start gap-2">
                                              <span className={`mt-0.5 shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${accent.badge}`}>
                                                {item.date}
                                              </span>

                                              <div className="min-w-0 flex-1">
                                                {(item.clinic || item.doctor) && (
                                                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                                                    {item.clinic || 'Sem local'}
                                                    {item.clinic && item.doctor ? ' · ' : ''}
                                                    {item.doctor ? `Dr(a). ${item.doctor}` : ''}
                                                  </p>
                                                )}

                                                {item.note && (
                                                  <p className="text-[11px] text-muted-foreground italic line-clamp-1">{item.note}</p>
                                                )}
                                              </div>
                                            </article>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </section>
                              ))}
                              {visibleItems.length === 0 && (
                                <p className="rounded-md border border-dashed px-2.5 py-2 text-xs text-muted-foreground">
                                  Sem registos
                                </p>
                              )}
                              {remainingItems > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setCategoryItemCounts((prev) => ({
                                    ...prev,
                                    [category]: (prev[category] ?? 4) + 4,
                                  }))}
                                  className="w-full text-center py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded transition-colors"
                                >
                                  Carregar mais ({remainingItems} {remainingItems === 1 ? 'entrada' : 'entradas'})
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </section>
                  );
                      })}
                    </div>
                  </div>
                ))}

              {remainingCategoryCount > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setVisibleCategoryCount((prev) => Math.min(prev + 4, orderedVisibleCategoryCards.length))}
                    className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:bg-muted"
                  >
                    Carregar mais
                  </button>

                  {visibleCategoryCount > 4 && (
                    <button
                      type="button"
                      onClick={() => setVisibleCategoryCount(4)}
                      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Mostrar menos
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Cholesterol control table */}
      {cholesterolRows.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b bg-gradient-to-r from-muted/40 to-muted/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Controlo do colesterol</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Valores em mg/dL. O rácio Total/HDL é uma divisão simples do colesterol total pelo HDL (o colesterol "bom").
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Exemplo: se Total = 240 e HDL = 60, então rácio = 4. Em geral, quanto menor este valor, melhor.
                </p>
              </div>

              <div className="shrink-0 flex flex-wrap items-center justify-end gap-2">
                {isEditingCholesterol ? (
                  <>
                    <button
                      type="button"
                      onClick={addDraftCholesterolEntry}
                      className="rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                    >
                      Adicionar análise
                    </button>
                    <button
                      type="button"
                      onClick={cancelCholesterolEdit}
                      className="rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={saveCholesterolEdits}
                      disabled={savingCholesterol}
                      className="rounded-md bg-primary text-primary-foreground px-2.5 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {savingCholesterol && <Loader2 className="w-3 h-3 animate-spin" />}
                      Guardar colesterol
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={startCholesterolEdit}
                    className="rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    Editar tabela
                  </button>
                )}

                {hasHiddenCholesterolYears && (
                  <button
                    type="button"
                    onClick={() => setShowAllCholesterolYears((prev) => !prev)}
                    className="rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    {showAllCholesterolYears ? 'Esconder anos antigos' : 'Mostrar anos antigos'}
                  </button>
                )}
              </div>
            </div>

            {(() => {
              if (!latestCholesterolRow) return null;
              const latest = latestCholesterolRow;
              const total = totalLegend(latest.total);
              const hdl = hdlLegend(latest.hdl);
              const ldl = ldlLegend(latest.ldl);
              const tri = triglyceridesLegend(latest.triglycerides);
              const ratio = ratioLegend(latest.total, latest.hdl);

              const cards = [
                { title: 'Total', value: latest.total ?? '-', tone: total },
                { title: 'HDL', value: latest.hdl ?? '-', tone: hdl },
                { title: 'LDL', value: latest.ldl ?? '-', tone: ldl },
                { title: 'Triglicerídeos', value: latest.triglycerides ?? '-', tone: tri },
                { title: 'Rácio Total/HDL', value: ratio.value, tone: { label: ratio.label, color: ratio.color } },
              ];

              return (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {cards.map((card) => (
                    <div key={card.title} className="rounded-lg border bg-background px-3 py-2.5 shadow-sm">
                      <p className="text-[11px] tracking-wide uppercase text-muted-foreground font-semibold">{card.title}</p>
                      <p className={`mt-1 text-2xl leading-none font-extrabold ${card.tone.color}`}>{card.value}</p>
                      <p className={`mt-1 text-xs font-semibold ${card.tone.color}`}>{card.tone.label}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            <details className="mt-3 text-xs">
              <summary className="cursor-pointer font-medium text-foreground">Ver limites de referência</summary>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-muted-foreground">
                <div className="rounded-md border bg-background px-2 py-1.5">
                  <p className="font-semibold text-foreground">Total</p>
                  <p>&lt;200 desejável, 200-239 limite, &gt;=240 elevado</p>
                </div>
                <div className="rounded-md border bg-background px-2 py-1.5">
                  <p className="font-semibold text-foreground">HDL</p>
                  <p>&lt;40 risco elevado, 40-55 intermédio, &gt;55 reduzido</p>
                </div>
                <div className="rounded-md border bg-background px-2 py-1.5">
                  <p className="font-semibold text-foreground">LDL</p>
                  <p>&lt;100 ótimo, 100-129 quase desejável, 130-159 limite, 160-189 elevado, &gt;=190 muito elevado</p>
                </div>
                <div className="rounded-md border bg-background px-2 py-1.5">
                  <p className="font-semibold text-foreground">Triglicerídeos</p>
                  <p>&lt;150 normal, 150-199 limite, 200-499 elevado, &gt;=500 muito elevado</p>
                </div>
                <div className="rounded-md border bg-background px-2 py-1.5 sm:col-span-2 lg:col-span-2">
                  <p className="font-semibold text-foreground">Rácio Total/HDL</p>
                  <p>Fórmula: Total/HDL. Referência usada: &lt;3.5 ótimo, 3.5-5 intermédio, &gt;5 elevado.</p>
                </div>
              </div>
            </details>
          </div>
          <div className="md:hidden p-3 space-y-2">
            {visibleCholesterolRows.map((row, idx) => {
              const ratio = ratioLegend(row.total, row.hdl);
              const total = totalLegend(row.total);
              const hdl = hdlLegend(row.hdl);
              const ldl = ldlLegend(row.ldl);
              const tri = triglyceridesLegend(row.triglycerides);
              const previous = visibleCholesterolRows[idx - 1];
              const showYear = !previous || previous.year !== row.year;
              const showOrder = (previous && previous.year === row.year) || row.entryOrder > 1;

              return (
                <article key={`mobile-${row.id}`} className="rounded-lg border bg-background p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">
                      {isEditingCholesterol ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={2000}
                            value={row.year}
                            onChange={(e) => updateDraftCholesterolField(row.id, 'year', e.target.value)}
                            className="w-20 rounded border bg-background px-2 py-1 text-xs text-center"
                          />
                          <input
                            type="number"
                            min={1}
                            value={row.entryOrder}
                            onChange={(e) => updateDraftCholesterolField(row.id, 'entryOrder', e.target.value)}
                            className="w-14 rounded border bg-background px-2 py-1 text-xs text-center"
                          />
                        </div>
                      ) : (
                        <>
                          {showYear ? row.year : 'Mesmo ano'}
                          {showOrder && <span className="ml-1 text-xs text-muted-foreground">#{row.entryOrder}</span>}
                        </>
                      )}
                    </div>

                    {isEditingCholesterol && (
                      <button
                        type="button"
                        onClick={() => removeDraftCholesterolEntry(row.id)}
                        className="inline-flex items-center justify-center rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                        title="Apagar entrada"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border p-2">
                      <p className="text-muted-foreground">Total</p>
                      {isEditingCholesterol ? (
                        <input
                          type="number"
                          value={row.total ?? ''}
                          onChange={(e) => updateDraftCholesterolField(row.id, 'total', e.target.value)}
                          className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <p className={`mt-1 text-base font-bold ${total.color}`}>{row.total ?? '-'}</p>
                      )}
                    </div>

                    <div className="rounded border p-2">
                      <p className="text-muted-foreground">HDL</p>
                      {isEditingCholesterol ? (
                        <input
                          type="number"
                          value={row.hdl ?? ''}
                          onChange={(e) => updateDraftCholesterolField(row.id, 'hdl', e.target.value)}
                          className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <p className={`mt-1 text-base font-bold ${hdl.color}`}>{row.hdl ?? '-'}</p>
                      )}
                    </div>

                    <div className="rounded border p-2">
                      <p className="text-muted-foreground">LDL</p>
                      {isEditingCholesterol ? (
                        <input
                          type="number"
                          value={row.ldl ?? ''}
                          onChange={(e) => updateDraftCholesterolField(row.id, 'ldl', e.target.value)}
                          className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <p className={`mt-1 text-base font-bold ${ldl.color}`}>{row.ldl ?? '-'}</p>
                      )}
                    </div>

                    <div className="rounded border p-2">
                      <p className="text-muted-foreground">Triglicerídeos</p>
                      {isEditingCholesterol ? (
                        <input
                          type="number"
                          value={row.triglycerides ?? ''}
                          onChange={(e) => updateDraftCholesterolField(row.id, 'triglycerides', e.target.value)}
                          className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <p className={`mt-1 text-base font-bold ${tri.color}`}>{row.triglycerides ?? '-'}</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded border p-2">
                    <p className="text-xs text-muted-foreground">Rácio Total/HDL</p>
                    <p className={`mt-1 text-base font-bold ${ratio.color}`}>{ratio.value}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
          <table className="min-w-[700px] w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-border bg-muted/30 p-2 text-center font-semibold w-[74px]">Ano</th>
                <th className="border border-border bg-muted/30 p-2 text-center font-semibold">Total</th>
                <th className="border border-border bg-muted/30 p-2 text-center font-semibold">HDL</th>
                <th className="border border-border bg-muted/30 p-2 text-center font-semibold">LDL</th>
                <th className="border border-border bg-muted/30 p-2 text-center font-semibold">Triglicerídeos</th>
                <th className="border border-border bg-muted/30 p-2 text-center font-semibold">Rácio</th>
                {isEditingCholesterol && (
                  <th className="border border-border bg-muted/30 p-2 text-center font-semibold w-[74px]">Ações</th>
                )}
              </tr>
            </thead>
            <tbody>
              {visibleCholesterolRows.map((row, idx) => {
                const ratio = ratioLegend(row.total, row.hdl);
                const total = totalLegend(row.total);
                const hdl = hdlLegend(row.hdl);
                const ldl = ldlLegend(row.ldl);
                const tri = triglyceridesLegend(row.triglycerides);
                const previous = visibleCholesterolRows[idx - 1];
                const showYear = !previous || previous.year !== row.year;
                const showOrder = (previous && previous.year === row.year) || row.entryOrder > 1;

                return (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    <td className="border border-border bg-muted/10 p-2 text-center font-semibold">
                      {isEditingCholesterol ? (
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            min={2000}
                            value={row.year}
                            onChange={(e) => updateDraftCholesterolField(row.id, 'year', e.target.value)}
                            className="w-full rounded border bg-background px-1.5 py-1 text-xs text-center"
                          />
                          <input
                            type="number"
                            min={1}
                            value={row.entryOrder}
                            onChange={(e) => updateDraftCholesterolField(row.id, 'entryOrder', e.target.value)}
                            className="w-full rounded border bg-background px-1.5 py-1 text-xs text-center"
                          />
                        </div>
                      ) : (
                        <>
                          {showYear ? row.year : ''}
                          {showOrder && (
                            <div className="text-[10px] font-normal text-muted-foreground">#{row.entryOrder}</div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="border border-border p-2 text-center">
                      {isEditingCholesterol ? (
                        <input
                          type="number"
                          value={row.total ?? ''}
                          onChange={(e) => updateDraftCholesterolField(row.id, 'total', e.target.value)}
                          className="w-full rounded border bg-background px-2 py-1 text-sm text-center"
                        />
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className={`text-lg leading-none font-bold ${total.color}`}>{row.total ?? '-'}</span>
                          <span className={`text-[11px] font-medium ${total.color}`}>{total.label}</span>
                        </div>
                      )}
                    </td>
                    <td className="border border-border p-2 text-center">
                      {isEditingCholesterol ? (
                        <input
                          type="number"
                          value={row.hdl ?? ''}
                          onChange={(e) => updateDraftCholesterolField(row.id, 'hdl', e.target.value)}
                          className="w-full rounded border bg-background px-2 py-1 text-sm text-center"
                        />
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className={`text-lg leading-none font-bold ${hdl.color}`}>{row.hdl ?? '-'}</span>
                          <span className={`text-[11px] font-medium ${hdl.color}`}>{hdl.label}</span>
                        </div>
                      )}
                    </td>
                    <td className="border border-border p-2 text-center">
                      {isEditingCholesterol ? (
                        <input
                          type="number"
                          value={row.ldl ?? ''}
                          onChange={(e) => updateDraftCholesterolField(row.id, 'ldl', e.target.value)}
                          className="w-full rounded border bg-background px-2 py-1 text-sm text-center"
                        />
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className={`text-lg leading-none font-bold ${ldl.color}`}>{row.ldl ?? '-'}</span>
                          <span className={`text-[11px] font-medium ${ldl.color}`}>{ldl.label}</span>
                        </div>
                      )}
                    </td>
                    <td className="border border-border p-2 text-center">
                      {isEditingCholesterol ? (
                        <input
                          type="number"
                          value={row.triglycerides ?? ''}
                          onChange={(e) => updateDraftCholesterolField(row.id, 'triglycerides', e.target.value)}
                          className="w-full rounded border bg-background px-2 py-1 text-sm text-center"
                        />
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className={`text-lg leading-none font-bold ${tri.color}`}>{row.triglycerides ?? '-'}</span>
                          <span className={`text-[11px] font-medium ${tri.color}`}>{tri.label}</span>
                        </div>
                      )}
                    </td>
                    <td className="border border-border p-2 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-lg leading-none font-bold ${ratio.color}`}>{ratio.value}</span>
                        <span className={`text-[11px] font-medium ${ratio.color}`}>{ratio.label}</span>
                      </div>
                    </td>
                    {isEditingCholesterol && (
                      <td className="border border-border p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeDraftCholesterolEntry(row.id)}
                          className="inline-flex items-center justify-center rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                          title="Apagar entrada"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <h2 className="text-base font-semibold">{editing.label}</h2>
              <button onClick={() => setEditing(null)} className="p-1 rounded hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-5 py-4 space-y-6 flex-1">
              {editing.years.map((year) => {
                const visible = (editing.yearData[year] ?? []).filter((d) => !d.toDelete);
                return (
                  <div key={year} className="space-y-2">
                    <span className="text-xs font-bold text-muted-foreground">{year}</span>

                    {/* Existing appointments */}
                    {visible.map((draft) => (
                      <div key={draft.key} className="rounded-lg border bg-background/60 p-2 space-y-2">
                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${accent.badge}`}>
                          {draft.date}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Hospital/Clinica (opcional)"
                            value={draft.clinic}
                            onChange={(e) => updateClinic(year, draft.key, e.target.value)}
                            className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <input
                            type="text"
                            placeholder="Medico (opcional)"
                            value={draft.doctor}
                            onChange={(e) => updateDoctor(year, draft.key, e.target.value)}
                            className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Nota (opcional)"
                            value={draft.note}
                            onChange={(e) => updateNote(year, draft.key, e.target.value)}
                            className="flex-1 rounded-lg border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => removeAppt(year, draft.key)}
                            className="shrink-0 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Date picker to add */}
                    <input
                      type="date"
                      min={`${year}-01-01`}
                      max={`${year}-12-31`}
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addDate(year, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t shrink-0">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New category/entry modal */}
      {newCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 pt-20">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <h2 className="text-base font-semibold">Adicionar entrada</h2>
              <button onClick={() => setNewCategory(null)} className="p-1 rounded hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
              {/* Mode toggle */}
              {displayRows.length > 0 && (
                <div className="flex gap-2 rounded-lg border p-1 bg-muted/30">
                  <button
                    onClick={() => updateNewCategoryMode('add-to-existing')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                      newCategory.mode === 'add-to-existing'
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    Adicionar a existente
                  </button>
                  <button
                    onClick={() => updateNewCategoryMode('create')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                      newCategory.mode === 'create'
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    Nova categoria
                  </button>
                </div>
              )}

              {/* Category selection or creation */}
              {newCategory.mode === 'add-to-existing' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Selecionar categoria</label>
                  <select
                    value={newCategory.selectedCategory || ''}
                    onChange={(e) => updateSelectedCategory(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">— Escolha uma categoria —</option>
                    {displayRows.map((row) => (
                      <option key={row.label} value={row.label}>
                        {row.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Nome da categoria</label>
                  <input
                    type="text"
                    placeholder="ex: Dermatologia, Cardiologia"
                    value={newCategory.name}
                    onChange={(e) => updateNewCategoryName(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <label className="text-xs font-bold text-muted-foreground mt-2 block">Grupo geral</label>
                  <select
                    value={newCategory.group}
                    onChange={(e) => updateNewCategoryGroup(e.target.value as 'consultas' | 'exames')}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="consultas">Consultas</option>
                    <option value="exames">Exames</option>
                  </select>
                </div>
              )}

              {/* Entries */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">Datas das consultas/exames</label>
                {newCategory.entries.map((entry, idx) => (
                  <div key={entry.key} className="rounded-lg border bg-background/60 p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Entrada {idx + 1}</span>
                      {newCategory.entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEntryFromNew(entry.key)}
                          className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <input
                      type="date"
                      value={entry.date}
                      onChange={(e) => updateNewEntry(entry.key, 'date', e.target.value)}
                      className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Hospital/Clinica (opcional)"
                        value={entry.clinic}
                        onChange={(e) => updateNewEntry(entry.key, 'clinic', e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="text"
                        placeholder="Medico (opcional)"
                        value={entry.doctor}
                        onChange={(e) => updateNewEntry(entry.key, 'doctor', e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Nota (opcional)"
                      value={entry.note}
                      onChange={(e) => updateNewEntry(entry.key, 'note', e.target.value)}
                      className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                ))}

                {/* Add another date button */}
                <button
                  type="button"
                  onClick={addEntryToNew}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar outra data
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t shrink-0">
              <button
                onClick={closeNewCategory}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveNewCategory}
                disabled={savingCategory || newCategory.entries.filter(e => e.date).length === 0 || 
                  (newCategory.mode === 'create' && !newCategory.name.trim()) ||
                  (newCategory.mode === 'add-to-existing' && !newCategory.selectedCategory)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingCategory && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
