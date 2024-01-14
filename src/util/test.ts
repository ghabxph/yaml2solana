import axios from 'axios';

/**
 * Curls to localnet cluster health checker to check if local test validator is running
 */
export async function checkIfLocalnetIsRunning(): Promise<boolean> {
  try {
    const response = await axios.get('http://127.0.0.1:8899/health');
    return response.data === 'ok';
  } catch {
    return false;
  }
}
