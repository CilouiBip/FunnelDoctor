"use client";

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (startDate: Date | null, endDate: Date | null) => void;
  className?: string;
}

/**
 * Sélecteur de plage de dates
 * Utilise react-datepicker pour sélectionner une période
 * Gère automatiquement la conversion des dates au format ISO YYYY-MM-DD
 */
export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className = '',
}) => {
  // S'assurer que les dates sont bien des objets Date
  const [start, setStart] = useState<Date | null>(startDate ? new Date(startDate) : null);
  const [end, setEnd] = useState<Date | null>(endDate ? new Date(endDate) : null);

  // Mettre à jour les états internes quand les props changent
  useEffect(() => {
    setStart(startDate ? new Date(startDate) : null);
    setEnd(endDate ? new Date(endDate) : null);
  }, [startDate, endDate]);

  // Gérer le changement de date de début
  const handleStartDateChange = (date: Date | null) => {
    setStart(date);
    onChange(date, end);
  };

  // Gérer le changement de date de fin
  const handleEndDateChange = (date: Date | null) => {
    setEnd(date);
    onChange(start, date);
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex flex-col">
        <label htmlFor="start-date" className="text-sm text-gray-600 mb-1">
          Date de début
        </label>
        <DatePicker
          id="start-date"
          selected={start}
          onChange={handleStartDateChange}
          selectsStart
          startDate={start}
          endDate={end}
          dateFormat="yyyy-MM-dd"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
          placeholderText="Sélectionner une date"
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="end-date" className="text-sm text-gray-600 mb-1">
          Date de fin
        </label>
        <DatePicker
          id="end-date"
          selected={end}
          onChange={handleEndDateChange}
          selectsEnd
          startDate={start}
          endDate={end}
          minDate={start}
          dateFormat="yyyy-MM-dd"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
          placeholderText="Sélectionner une date"
        />
      </div>
    </div>
  );
};

export default DateRangePicker;
