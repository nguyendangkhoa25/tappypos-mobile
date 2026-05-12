import { registerForceLogout, forceLogout } from '../../services/authSession';

describe('authSession', () => {
  it('calls the registered handler with the given reason', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    registerForceLogout(handler);

    await forceLogout('session_expired');
    expect(handler).toHaveBeenCalledWith('session_expired');
  });

  it('calls handler with device_switched reason', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    registerForceLogout(handler);

    await forceLogout('device_switched');
    expect(handler).toHaveBeenCalledWith('device_switched');
  });

  it('defaults to session_expired when no reason is given', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    registerForceLogout(handler);

    await forceLogout();
    expect(handler).toHaveBeenCalledWith('session_expired');
  });

  it('replacing handler calls the new one', async () => {
    const first = jest.fn().mockResolvedValue(undefined);
    const second = jest.fn().mockResolvedValue(undefined);
    registerForceLogout(first);
    registerForceLogout(second);

    await forceLogout('user_initiated');
    expect(second).toHaveBeenCalledWith('user_initiated');
    expect(first).not.toHaveBeenCalled();
  });
});
