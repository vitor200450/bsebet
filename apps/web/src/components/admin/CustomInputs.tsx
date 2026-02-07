import { useState, useRef, useEffect } from "react";

export const CustomSelect = ({
  label,
  value,
  onChange,
  onConfirm,
  options,
  placeholder = "Select...",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onConfirm?: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm(""); // Reset search on close
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-black uppercase mb-1 ml-1 text-black">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border-[3px] border-black p-2 font-bold focus:outline-none focus:ring-4 focus:ring-[#ccff00] bg-white text-black flex items-center justify-between"
      >
        <span className={!value ? "text-gray-400 font-normal" : ""}>
          {selectedLabel || placeholder}
        </span>
        <span className="text-xs">▼</span>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-[3px] border-black border-t-0 z-50 max-h-64 overflow-y-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-2 border-b-2 border-black sticky top-0 bg-white z-10">
            <input
              autoFocus
              type="text"
              placeholder="SEARCH..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredOptions.length > 0) {
                  e.preventDefault();
                  const val = filteredOptions[0].value;
                  onChange(val);
                  setIsOpen(false);
                  setSearchTerm("");
                  if (onConfirm) onConfirm(val);
                }
              }}
              className="w-full border-2 border-gray-200 p-1 text-sm font-bold uppercase focus:outline-none focus:border-black text-black placeholder:text-gray-300"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filteredOptions.length === 0 ? (
            <div className="p-4 text-center text-xs font-bold text-gray-400 uppercase">
              No results found
            </div>
          ) : (
            filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                className="w-full text-left px-3 py-2 text-sm font-bold hover:bg-[#ccff00] hover:text-black border-b border-gray-100 last:border-0 text-black uppercase"
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const CustomDatePicker = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState(
    value ? new Date(value) : new Date(),
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  ).getDate();
  const firstDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  ).getDay();

  const handleDateClick = (day: number) => {
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    );
    // Format as YYYY-MM-DD for consistency with input[type=date]
    // Use local time instead of UTC to avoid off-by-one errors in simple implementation
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const formatted = `${year}-${month}-${d}`;

    onChange(formatted);
    setIsOpen(false);
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1),
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-black uppercase mb-1 ml-1 text-black">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border-[3px] border-black p-2 font-bold focus:outline-none focus:ring-4 focus:ring-[#ccff00] bg-white text-black flex items-center justify-between"
      >
        <span>{value || "Select Date"}</span>
        <span className="text-xs">📅</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-64 bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 p-2">
          <div className="flex justify-between items-center mb-2 bg-black text-white p-1">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="px-2 hover:text-[#ccff00] font-bold"
            >
              {"<"}
            </button>
            <span className="text-xs font-bold uppercase">
              {currentDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="px-2 hover:text-[#ccff00] font-bold"
            >
              {">"}
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
              <div key={d} className="text-[10px] font-bold text-gray-400">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              // Simple equality check
              const isSelected =
                value &&
                parseInt(value.split("-")[2]) === day &&
                parseInt(value.split("-")[1]) === currentDate.getMonth() + 1 &&
                parseInt(value.split("-")[0]) === currentDate.getFullYear();
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  className={`p-1 text-xs font-bold hover:bg-[#ccff00] hover:text-black rounded-sm ${isSelected ? "bg-black text-white" : "text-black"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const CustomTimePicker = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) => {
  return (
    <div>
      <label className="block text-xs font-black uppercase mb-1 ml-1 text-black">
        {label}
      </label>
      <div className="relative">
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border-[3px] border-black p-2 font-bold focus:outline-none focus:ring-4 focus:ring-[#ccff00] bg-white text-black h-[42px]"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none bg-white pl-1">
          ⏰
        </span>
      </div>
    </div>
  );
};
