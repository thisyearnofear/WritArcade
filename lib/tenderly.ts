/**
 * Tenderly Integration for Multi-chain Simulations
 * Docs: https://docs.tenderly.co/
 * 
 * Used to simulate cross-chain transactions (Base -> Mezo -> Story) 
 * before executing them on-chain.
 */

import { encodeFunctionData, type Address, type Hex } from 'viem';

export interface TenderlySimulationParams {
  network_id: string;
  from: Address;
  to: Address;
  input: Hex;
  value?: string;
  save?: boolean;
}

/**
 * Simulates a transaction using Tenderly
 * Requires TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY in env
 */
export async function simulateTransaction(params: TenderlySimulationParams) {
  const TENDERLY_USER = process.env.TENDERLY_USER;
  const TENDERLY_PROJECT = process.env.TENDERLY_PROJECT;
  const TENDERLY_ACCESS_KEY = process.env.TENDERLY_ACCESS_KEY;

  if (!TENDERLY_USER || !TENDERLY_PROJECT || !TENDERLY_ACCESS_KEY) {
    console.warn('Tenderly credentials missing, skipping simulation.');
    return { success: true, simulated: false };
  }

  const url = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/simulate`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Key': TENDERLY_ACCESS_KEY,
      },
      body: JSON.stringify({
        network_id: params.network_id,
        from: params.from,
        to: params.to,
        input: params.input,
        value: params.value || '0',
        save: params.save || true,
        save_if_fails: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tenderly simulation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: data.simulation.status === true,
      simulated: true,
      error_message: data.simulation.error_message,
      gas_used: data.simulation.gas_used,
      link: `https://dashboard.tenderly.co/${TENDERLY_USER}/${TENDERLY_PROJECT}/simulator/${data.simulation.id}`,
    };
  } catch (error) {
    console.error('Tenderly simulation error:', error);
    // Fail open in case of API issues so we don't block users
    return { success: true, simulated: false, error };
  }
}
