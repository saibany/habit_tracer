import { format, subDays, eachDayOfInterval, isToday, startOfDay } from 'date-fns';
import { cn } from '../../lib/utils';
import { HeatmapData } from '../../lib/queries';

interface HeatmapProps {
    data: HeatmapData[];
}

export const Heatmap = ({ data }: HeatmapProps) => {
    // Generate last 365 days
    const today = startOfDay(new Date());
    const yearAgo = subDays(today, 364);
    const days = eachDayOfInterval({ start: yearAgo, end: today });

    // Convert data array to lookup map
    const dataMap = new Map(data.map(d => [d.date, d.count]));

    // Group by weeks
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    days.forEach((day, i) => {
        currentWeek.push(day);
        if (day.getDay() === 6 || i === days.length - 1) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    const getLevel = (count: number): 0 | 1 | 2 | 3 | 4 => {
        if (count === 0) return 0;
        if (count === 1) return 1;
        if (count <= 3) return 2;
        if (count <= 5) return 3;
        return 4;
    };

    return (
        <div className="w-full overflow-x-auto pb-2">
            <div className="flex gap-[3px] min-w-max">
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-rows-7 gap-[3px]">
                        {/* Pad the first week */}
                        {weekIndex === 0 && week[0].getDay() > 0 &&
                            Array.from({ length: week[0].getDay() }).map((_, i) => (
                                <div key={`pad-${i}`} className="w-[10px] h-[10px]" />
                            ))
                        }
                        {week.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const count = dataMap.get(dateStr) || 0;
                            const level = getLevel(count);

                            return (
                                <div
                                    key={dateStr}
                                    className={cn(
                                        "w-[10px] h-[10px] rounded-[2px] transition-all cursor-pointer hover:ring-1 hover:scale-125",
                                        level === 0 && "bg-slate-100 dark:bg-slate-700 ring-slate-300 dark:ring-slate-500",
                                        level === 1 && "bg-teal-200 dark:bg-teal-900 ring-teal-400",
                                        level === 2 && "bg-teal-300 dark:bg-teal-700 ring-teal-500",
                                        level === 3 && "bg-teal-400 dark:bg-teal-500 ring-teal-600",
                                        level === 4 && "bg-teal-600 dark:bg-teal-400 ring-teal-700",
                                        isToday(day) && "ring-2 ring-indigo-500 dark:ring-indigo-400"
                                    )}
                                    title={`${format(day, 'MMM d, yyyy')}: ${count} completions`}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <span>Less</span>
                <div className="flex gap-[3px]">
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-slate-100 dark:bg-slate-700" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-teal-200 dark:bg-teal-900" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-teal-300 dark:bg-teal-700" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-teal-400 dark:bg-teal-500" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-teal-600 dark:bg-teal-400" />
                </div>
                <span>More</span>
            </div>
        </div>
    );
};
