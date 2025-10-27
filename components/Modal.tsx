import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "w-96",
    md: "w-1/2 max-w-2xl",
    lg: "w-3/4 max-w-4xl",
    xl: "w-4/5 max-w-6xl",
    full: "w-11/12 max-w-7xl",
  };

  return (
    <div className="z-50 fixed inset-0 bg-gray-600 bg-opacity-50 w-full h-full overflow-y-auto">
      <div
        className={`top-10 relative bg-white shadow-lg mx-auto mb-10 p-6 border rounded-md ${sizeClasses[size]}`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900 text-xl">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
