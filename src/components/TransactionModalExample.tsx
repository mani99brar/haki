'use client';

import { useState } from 'react';
import TransactionModal, { TransactionStep } from './TransactionModal';

/**
 * Example usage of TransactionModal component
 *
 * This demonstrates how to integrate the modal with your transaction flows.
 * Replace the setTimeout placeholders with your actual transaction logic.
 */

export default function TransactionModalExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<TransactionStep[]>([
    {
      id: 'connect',
      title: 'Connect Wallet',
      description: 'Approve the connection to your wallet',
      status: 'pending',
      action: {
        label: 'CONNECT WALLET',
        onClick: async () => {
          // Simulate wallet connection
          updateStepStatus('connect', 'processing');
          await new Promise(resolve => setTimeout(resolve, 2000));
          updateStepStatus('connect', 'success');
          moveToNextStep();
        },
      },
    },
    {
      id: 'approve',
      title: 'Approve Token',
      description: 'Approve the contract to spend your tokens',
      status: 'pending',
      action: {
        label: 'APPROVE',
        onClick: async () => {
          // Simulate token approval
          updateStepStatus('approve', 'processing');
          await new Promise(resolve => setTimeout(resolve, 2500));
          updateStepStatus('approve', 'success');
          moveToNextStep();
        },
      },
    },
    {
      id: 'deposit',
      title: 'Deposit Funds',
      description: 'Confirm the transaction in your wallet',
      status: 'pending',
      action: {
        label: 'DEPOSIT',
        onClick: async () => {
          // Simulate deposit transaction
          updateStepStatus('deposit', 'processing');
          await new Promise(resolve => setTimeout(resolve, 3000));
          updateStepStatus('deposit', 'success');
          moveToNextStep();
        },
      },
    },
    {
      id: 'confirm',
      title: 'Wait for Confirmation',
      description: 'Transaction is being confirmed on the blockchain',
      status: 'pending',
      // Auto-progress after 3 seconds (simulating blockchain confirmation)
      autoProgressDelay: 3000,
    },
  ]);

  const updateStepStatus = (stepId: string, status: TransactionStep['status']) => {
    setSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  const moveToNextStep = () => {
    setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleStepComplete = (stepId: string) => {
    updateStepStatus(stepId, 'success');
    moveToNextStep();
  };

  const handleAllComplete = () => {
    console.log('All steps completed!');
    // You can add additional logic here, like showing a success message
    // or navigating to another page
  };

  const resetModal = () => {
    setCurrentStepIndex(0);
    setSteps(prevSteps =>
      prevSteps.map(step => ({ ...step, status: 'pending' }))
    );
    setIsModalOpen(false);
  };

  const openModal = () => {
    resetModal();
    setIsModalOpen(true);
    // Set first step to active
    updateStepStatus('connect', 'active');
  };

  // Example: 3-step withdrawal flow
  const openWithdrawModal = () => {
    setSteps([
      {
        id: 'sign',
        title: 'Sign Message',
        description: 'Sign the withdrawal request with your wallet',
        status: 'active',
        action: {
          label: 'SIGN',
          onClick: async () => {
            updateStepStatus('sign', 'processing');
            await new Promise(resolve => setTimeout(resolve, 1500));
            updateStepStatus('sign', 'success');
            moveToNextStep();
          },
        },
      },
      {
        id: 'withdraw',
        title: 'Withdraw Funds',
        description: 'Confirm the withdrawal transaction',
        status: 'pending',
        action: {
          label: 'WITHDRAW',
          onClick: async () => {
            updateStepStatus('withdraw', 'processing');
            await new Promise(resolve => setTimeout(resolve, 2500));
            updateStepStatus('withdraw', 'success');
            moveToNextStep();
          },
        },
      },
      {
        id: 'complete',
        title: 'Withdrawal Complete',
        description: 'Funds have been sent to your wallet',
        status: 'pending',
        autoProgressDelay: 2000,
      },
    ]);
    setCurrentStepIndex(0);
    setIsModalOpen(true);
  };

  // Example: 2-step trade flow
  const openTradeModal = () => {
    setSteps([
      {
        id: 'approve-trade',
        title: 'Approve Trade',
        description: 'Approve the trade in your wallet',
        status: 'active',
        action: {
          label: 'APPROVE',
          onClick: async () => {
            updateStepStatus('approve-trade', 'processing');
            await new Promise(resolve => setTimeout(resolve, 2000));
            updateStepStatus('approve-trade', 'success');
            moveToNextStep();
          },
        },
      },
      {
        id: 'execute-trade',
        title: 'Execute Trade',
        description: 'Your trade is being executed on Yellow Network',
        status: 'pending',
        autoProgressDelay: 3000,
      },
    ]);
    setCurrentStepIndex(0);
    setIsModalOpen(true);
  };

  return (
    <div style={{ padding: '40px' }}>
      <h1>Transaction Modal Examples</h1>
      <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
        <button
          onClick={openModal}
          style={{
            padding: '12px 24px',
            background: 'var(--accent-coral)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Open 4-Step Deposit Modal
        </button>
        <button
          onClick={openWithdrawModal}
          style={{
            padding: '12px 24px',
            background: 'var(--accent-teal)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Open 3-Step Withdraw Modal
        </button>
        <button
          onClick={openTradeModal}
          style={{
            padding: '12px 24px',
            background: 'var(--accent-purple)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Open 2-Step Trade Modal
        </button>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={resetModal}
        title="Transaction"
        steps={steps}
        currentStepIndex={currentStepIndex}
        onStepComplete={handleStepComplete}
        onAllComplete={handleAllComplete}
        disableBackdropClose={true}
      />
    </div>
  );
}
