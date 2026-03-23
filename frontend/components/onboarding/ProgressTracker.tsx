"use client";

interface Step {
  number: number;
  name: string;
  completed: boolean;
}

interface ProgressTrackerProps {
  currentStep: number;
  steps: Step[];
}

export function ProgressTracker({ currentStep, steps }: ProgressTrackerProps) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-4 mb-8">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                step.completed || step.number === currentStep
                  ? "bg-black text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step.number}
            </div>
            
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-4 transition-colors ${
                  step.completed ? "bg-black" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="hidden sm:flex justify-between px-2">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`text-sm font-bold uppercase tracking-widest ${
              step.number === currentStep ? "text-black" : "text-gray-400"
            }`}
          >
            {step.name}
          </div>
        ))}
      </div>
    </div>
  );
}
