"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface SkillsAutocompleteProps {
  selectedSkills: string[];
  onSkillsChange: (skills: string[]) => void;
  suggestions: readonly string[] | string[];
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function SkillsAutocomplete({
  selectedSkills,
  onSkillsChange,
  suggestions,
  label,
  placeholder = "Type to search skills (e.g., React, Python, AWS)",
  error,
  disabled = false
}: SkillsAutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = suggestions.filter(skill =>
    skill.toLowerCase().includes(inputValue.toLowerCase()) &&
    !selectedSkills.some(s => s.toLowerCase() === skill.toLowerCase())
  ).slice(0, 10);

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;

    const isDuplicate = selectedSkills.some(
      s => s.toLowerCase() === trimmed.toLowerCase()
    );

    if (!isDuplicate) {
      onSkillsChange([...selectedSkills, trimmed]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeSkill = (skillToRemove: string) => {
    onSkillsChange(selectedSkills.filter(skill => skill !== skillToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      e.preventDefault();
      if (filteredSuggestions.length > 0 && inputValue) {
        addSkill(filteredSuggestions[0]);
      } else if (inputValue) {
        addSkill(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && selectedSkills.length > 0) {
      e.preventDefault();
      removeSkill(selectedSkills[selectedSkills.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      {label && (
        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
          {label}
        </label>
      )}

      {selectedSkills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedSkills.map((skill) => (
            <span
              key={skill}
              className="px-3 py-1 bg-gray-100 text-sm font-medium inline-flex items-center gap-2"
            >
              {skill}
              <button
                type="button"
                onClick={() => !disabled && removeSkill(skill)}
                disabled={disabled}
                className="text-gray-500 hover:text-black leading-none disabled:cursor-not-allowed"
                aria-label={`Remove ${skill}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-3 border ${
            error ? 'border-red-500' : 'border-gray-200'
          } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''} focus:border-black outline-none`}
        />

        {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 shadow-lg max-h-60 overflow-y-auto">
            {filteredSuggestions.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSkill(skill)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                {skill}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}

      <p className="text-xs text-gray-500 mt-2">
        Press Enter, comma, or semicolon to add a skill. Backspace to remove the last one.
      </p>
    </div>
  );
}
