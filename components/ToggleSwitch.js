export default function ToggleSwitch({ checked, onChange, label, disabled = false }) {
  const handleToggle = () => {
    if (!disabled && onChange) {
      // For simple onChange handlers (like handleScheduleToggle)
      if (typeof onChange === 'function' && onChange.length === 0) {
        onChange();
      } else {
        // For input change handlers that expect an event object
        onChange({ target: { checked: !checked } });
      }
    }
  };

  return (
    <div className="flex items-center">
      <div className="relative">
        <div
          onClick={handleToggle}
          className={`block w-12 h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
            checked
              ? 'bg-blue-600'
              : 'bg-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80'}`}
        >
          <div
            className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out shadow-sm ${
              checked ? 'transform translate-x-6' : ''
            }`}
          />
        </div>
      </div>
      {label && (
        <div 
          className={`ml-3 block text-sm text-gray-700 ${disabled ? 'opacity-50' : ''} ${!disabled ? 'cursor-pointer' : ''}`}
          onClick={!disabled ? handleToggle : undefined}
        >
          {label}
        </div>
      )}
    </div>
  );
}