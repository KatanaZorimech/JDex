import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  MapPin,
  FileText,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { campusApi } from '@client/src/api/campus';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  SCHOOL_CATEGORY_LABELS,
  type CampusFairEvent,
  type SchoolCategory,
} from '@shared/api.interface';

const WEEK_DAYS: string[] = ['一', '二', '三', '四', '五', '六', '日'];

const CATEGORY_COLORS: Record<SchoolCategory, string> = {
  '985': 'bg-red-100 text-red-700 border-red-200',
  '211': 'bg-blue-100 text-blue-700 border-blue-200',
  double_first_class: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};

interface DayCell {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

const padZero = (n: number): string => String(n).padStart(2, '0');

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatTime = (isoStr: string): string => {
  const d: Date = new Date(isoStr);
  return `${padZero(d.getHours())}:${padZero(d.getMinutes())}`;
};

const formatFullDateTime = (isoStr: string): string => {
  const d: Date = new Date(isoStr);
  const weekDays: string[] = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]} ${padZero(d.getHours())}:${padZero(d.getMinutes())}`;
};

const FairCalendarPage: React.FC = () => {
  const today: Date = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [events, setEvents] = useState<CampusFairEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const eventsByDay: Map<number, CampusFairEvent[]> = useMemo(() => {
    const m: Map<number, CampusFairEvent[]> = new Map();
    for (const ev of events) {
      const d: Date = new Date(ev.fairTime);
      const day: number = d.getDate();
      if (!m.has(day)) m.set(day, []);
      m.get(day)!.push(ev);
    }
    return m;
  }, [events]);

  const dayCells: DayCell[] = useMemo(() => {
    const firstDay: Date = new Date(viewYear, viewMonth, 1);
    // Monday = 0, Sunday = 6 (Chinese convention: 周一到周日)
    const firstWeekday: number = (firstDay.getDay() + 6) % 7;
    const startDate: Date = new Date(viewYear, viewMonth, 1 - firstWeekday);
    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const d: Date = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      cells.push({
        date: d,
        dayNumber: d.getDate(),
        isCurrentMonth: d.getMonth() === viewMonth,
        isToday: isSameDay(d, today),
      });
    }
    return cells;
  }, [viewYear, viewMonth, today]);

  const selectedDayEvents: CampusFairEvent[] = useMemo(() => {
    if (!selectedDate) return [];
    const day: number = selectedDate.getDate();
    return eventsByDay.get(day) || [];
  }, [selectedDate, eventsByDay]);

  const hasAnyFair: boolean = events.length > 0;

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setLoading(true);
      setError('');
      try {
        const data: CampusFairEvent[] = await campusApi.getFairCalendar(
          viewYear,
          viewMonth + 1,
        );
        setEvents(data || []);
      } catch (err: unknown) {
        logger.error('获取双选会日历失败', err);
        setError('加载失败，请稍后重试');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [viewYear, viewMonth]);

  const goToPrevMonth = (): void => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = (): void => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const goToToday = (): void => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const handleDayClick = (cell: DayCell): void => {
    if (!cell.isCurrentMonth) return;
    const dayEvents: CampusFairEvent[] | undefined = eventsByDay.get(
      cell.dayNumber,
    );
    if (!dayEvents || dayEvents.length === 0) return;
    setSelectedDate(cell.date);
    setDialogOpen(true);
  };

  const dialogTitle: string = selectedDate
    ? `双选会详情 - ${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`
    : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <h1 className="text-xl font-semibold">双选会日历</h1>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {/* Header: navigation */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevMonth}
              aria-label="上个月"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[120px] text-center text-lg font-semibold">
              {viewYear}年{viewMonth + 1}月
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextMonth}
              aria-label="下个月"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            今天
          </Button>
        </div>

        {/* Week header */}
        <div className="grid grid-cols-7 border-b pb-2">
          {WEEK_DAYS.map((wd: string) => (
            <div
              key={wd}
              className="text-center text-sm font-medium text-muted-foreground"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="flex h-[480px] items-center justify-center text-muted-foreground">
            加载中...
          </div>
        ) : error ? (
          <div className="flex h-[480px] items-center justify-center text-red-500">
            {error}
          </div>
        ) : !hasAnyFair ? (
          <div className="flex h-[480px] items-center justify-center text-muted-foreground">
            本月暂无双选会安排
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {dayCells.map((cell: DayCell, idx: number) => {
              const dayEvents: CampusFairEvent[] | undefined = eventsByDay.get(
                cell.dayNumber,
              );
              const hasEvents: boolean =
                cell.isCurrentMonth && !!dayEvents && dayEvents.length > 0;
              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(cell)}
                  className={[
                    'min-h-[80px] border-b border-r p-2 transition-colors',
                    cell.isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                    hasEvents
                      ? 'cursor-pointer bg-blue-50/50 hover:bg-blue-50'
                      : '',
                    !cell.isCurrentMonth ? 'text-gray-400' : '',
                    idx % 7 === 0 ? 'border-l' : '',
                    idx < 7 ? 'border-t' : '',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'mb-1 text-sm',
                      cell.isToday && cell.isCurrentMonth
                        ? 'inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground'
                        : '',
                    ].join(' ')}
                  >
                    {cell.dayNumber}
                  </div>
                  {hasEvents && (
                    <div className="space-y-1">
                      {dayEvents!.slice(0, 2).map(
                        (ev: CampusFairEvent) => (
                          <div
                            key={ev.id}
                            className={[
                              'truncate rounded px-1.5 py-0.5 text-[11px] font-medium',
                              CATEGORY_COLORS[ev.category],
                            ].join(' ')}
                            title={ev.schoolName}
                          >
                            {ev.schoolName}
                          </div>
                        ),
                      )}
                      {dayEvents!.length > 2 && (
                        <div className="text-[11px] text-muted-foreground">
                          +{dayEvents!.length - 2} 场
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day detail dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedDayEvents.map((ev: CampusFairEvent) => (
              <div
                key={ev.id}
                className="rounded-lg border bg-gray-50/50 p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{ev.schoolName}</h3>
                  <Badge
                    variant="outline"
                    className={CATEGORY_COLORS[ev.category]}
                  >
                    {SCHOOL_CATEGORY_LABELS[ev.category]}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-md bg-blue-50/60 p-3">
                    <Clock className="mt-0.5 size-4 shrink-0 text-blue-600" />
                    <div>
                      <div className="text-xs text-muted-foreground">双选会时间</div>
                      <div className="font-medium text-foreground">
                        {formatFullDateTime(ev.fairTime)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-md bg-emerald-50/60 p-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <div>
                      <div className="text-xs text-muted-foreground">双选会地点</div>
                      <div className="font-medium text-foreground">
                        {ev.location || '地点待定'}
                      </div>
                    </div>
                  </div>
                  {ev.remark && (
                    <div className="flex items-start gap-3 rounded-md bg-gray-50/80 p-3">
                      <FileText className="mt-0.5 size-4 shrink-0 text-gray-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">备注</div>
                        <div className="font-medium text-foreground">
                          {ev.remark}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FairCalendarPage;
