import { memo } from "react";
import type { ConfigGridCell } from "@/types/config";

interface ConfigCellProps {
  parameter: string;
  environment: string;
  cellData: string | ConfigGridCell;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onCellClick: (parameter: string, environment: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

function ConfigCell({
  parameter,
  environment,
  cellData,
  isEditing,
  editValue,
  onEditValueChange,
  onCellClick,
  onSave,
  onCancel,
}: ConfigCellProps) {
  // Type guard: cellData is ConfigGridCell if it has 'value' property
  const cellValue =
    typeof cellData === "object" && cellData !== null ? cellData.value : null;

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSave();
    if (e.key === "Escape") onCancel();
  };

  if (isEditing) {
    return (
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded w-full text-sm"
          autoFocus
          onKeyPress={handleKeyPress}
        />
        <button
          onClick={onSave}
          className="text-green-600 hover:text-green-800"
        >
          ✓
        </button>
        <button onClick={onCancel} className="text-red-600 hover:text-red-800">
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => onCellClick(parameter, environment)}
      className="hover:bg-gray-100 px-2 py-1 rounded min-h-[28px] cursor-pointer"
      title="Click to edit"
    >
      {cellValue || <span className="text-gray-400 italic">empty</span>}
    </div>
  );
}

export default memo(ConfigCell);
