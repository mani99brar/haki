'use client';

import { useState, useEffect } from 'react';
import { createPortal } from "react-dom";
import './TransactionModal.css';

export type StepStatus = 'pending' | 'active' | 'processing' | 'success' | 'error';

export interface TransactionStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  // Optional: Custom content for the step
  content?: React.ReactNode;
  // Optional: Action button config
  action?: {
    label: string;
    onClick: () => Promise<void> | void;
  };
  // Optional: Auto-progress after delay (in ms)
  autoProgressDelay?: number;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: TransactionStep[];
  currentStepIndex: number;
  onStepComplete?: (stepId: string) => void;
  onAllComplete?: () => void;
  // Optional: Disable backdrop click to close
  disableBackdropClose?: boolean;
}

export default function TransactionModal({
  isOpen,
  onClose,
  title,
  steps,
  currentStepIndex,
  onStepComplete,
  onAllComplete,
  disableBackdropClose = false,
}: TransactionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const currentStep = steps[currentStepIndex];
  const allStepsComplete = steps.every((step) => step.status === "success");

  // Auto-progress logic
  useEffect(() => {
    if (!currentStep || !isOpen) return;

    if (currentStep.autoProgressDelay && currentStep.status === "processing") {
      const timer = setTimeout(() => {
        // Simulate completion after delay
        if (onStepComplete) {
          onStepComplete(currentStep.id);
        }
      }, currentStep.autoProgressDelay);

      return () => clearTimeout(timer);
    }
  }, [currentStep, isOpen, onStepComplete]);

  useEffect(() => {
    setMounted(true);
    // Prevent scrolling on the body when modal is open
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle all steps complete
  useEffect(() => {
    if (allStepsComplete && onAllComplete) {
      const timer = setTimeout(() => {
        onAllComplete();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [allStepsComplete, onAllComplete]);

  const handleAction = async () => {
    if (!currentStep?.action || isProcessing) return;

    setIsProcessing(true);
    try {
      await currentStep.action.onClick();
    } catch (error) {
      console.error("Step action failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (
      e.target === e.currentTarget &&
      !disableBackdropClose &&
      !isProcessing
    ) {
      onClose();
    }
  };

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case "pending":
        return "○";
      case "active":
        return "◉";
      case "processing":
        return "⟳";
      case "success":
        return "✓";
      case "error":
        return "✗";
      default:
        return "○";
    }
  };

  const getStatusColor = (status: StepStatus) => {
    switch (status) {
      case "pending":
        return "status-pending";
      case "active":
        return "status-active";
      case "processing":
        return "status-processing";
      case "success":
        return "status-success";
      case "error":
        return "status-error";
      default:
        return "status-pending";
    }
  };

  if (!isOpen || !mounted) return null;

  // Define the modal JSX
  const modalJSX = (
    <div className="transaction-modal-overlay" onClick={handleBackdropClick}>
      <div className="transaction-modal-overlay" onClick={handleBackdropClick}>
      <div className="transaction-modal-brutal">
        {/* Header */}
        <div className="modal-header-brutal">
          <div className="modal-title-brutal">
            <span className="title-icon">⚡</span>
            {title}
          </div>
          {!isProcessing && (
            <button
              className="modal-close-brutal"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="modal-progress-brutal">
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{
                width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
              }}
            />
          </div>
          <div className="progress-text-brutal">
            STEP {currentStepIndex + 1} OF {steps.length}
          </div>
        </div>

        {/* Steps List */}
        <div className="modal-steps-list-brutal">
          {steps.map((step, index) => {
            const isCurrentStep = index === currentStepIndex;
            const isPastStep = index < currentStepIndex;

            return (
              <div
                key={step.id}
                className={`step-item-brutal ${getStatusColor(step.status)} ${
                  isCurrentStep ? "current" : ""
                } ${isPastStep ? "past" : ""}`}
              >
                <div className="step-indicator-brutal">
                  <span
                    className={`step-icon ${step.status === "processing" ? "spinning" : ""}`}
                  >
                    {getStepIcon(step.status)}
                  </span>
                  <div className="step-number">{index + 1}</div>
                </div>
                <div className="step-details-brutal">
                  <div className="step-title-brutal">{step.title}</div>
                  <div className="step-description-brutal">
                    {step.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Step Content */}
        {currentStep && (
          <div className="modal-content-brutal">
            <div className="content-card-brutal">
              {currentStep.content ? (
                currentStep.content
              ) : (
                <div className="default-content-brutal">
                  <div className="content-status-icon">
                    {currentStep.status === "processing" ? (
                      <div className="spinner-brutal">⟳</div>
                    ) : currentStep.status === "success" ? (
                      <div className="success-icon-brutal">✓</div>
                    ) : currentStep.status === "error" ? (
                      <div className="error-icon-brutal">✗</div>
                    ) : (
                      <div className="waiting-icon-brutal">◉</div>
                    )}
                  </div>
                  <div className="content-message-brutal">
                    {currentStep.status === "processing" &&
                      "Processing transaction..."}
                    {currentStep.status === "success" &&
                      "Step completed successfully!"}
                    {currentStep.status === "error" &&
                      "Step failed. Please try again."}
                    {currentStep.status === "active" && "Ready to proceed"}
                    {currentStep.status === "pending" && "Waiting to start..."}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="modal-actions-brutal">
          {!allStepsComplete && (
            <>
              <button
                className="modal-btn-brutal secondary"
                onClick={onClose}
                disabled={isProcessing}
              >
                CANCEL
              </button>
              {currentStep?.action && (
                <button
                  className={`modal-btn-brutal primary ${isProcessing ? "processing" : ""}`}
                  onClick={handleAction}
                  disabled={isProcessing || currentStep.status === "processing"}
                >
                  {isProcessing ? (
                    <>
                      <span className="btn-spinner">⟳</span>
                      PROCESSING...
                    </>
                  ) : (
                    currentStep.action.label
                  )}
                </button>
              )}
            </>
          )}
          {allStepsComplete && (
            <button className="modal-btn-brutal success" onClick={onClose}>
              <span className="btn-icon">✓</span>
              CLOSE
            </button>
          )}
        </div>

        {/* Footer Status */}
        <div className="modal-footer-brutal">
          <div className="footer-status-brutal">
            {allStepsComplete ? (
              <span className="status-message success">
                ALL STEPS COMPLETED ✓
              </span>
            ) : currentStep?.status === "error" ? (
              <span className="status-message error">ERROR OCCURRED ✗</span>
            ) : currentStep?.status === "processing" ? (
              <span className="status-message processing">
                TRANSACTION IN PROGRESS...
              </span>
            ) : (
              <span className="status-message">
                FOLLOW THE STEPS TO COMPLETE
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
      <div className="transaction-modal-brutal">{/* Your content */}</div>
    </div>
  );

  // Teleport the JSX to the end of the <body> tag
  return createPortal(modalJSX, document.body);
}
