const _store: Record<string, string> = {};

export const getItemAsync = jest.fn(async (key: string): Promise<string | null> =>
  _store[key] ?? null,
);

export const setItemAsync = jest.fn(async (key: string, value: string): Promise<void> => {
  _store[key] = value;
});

export const deleteItemAsync = jest.fn(async (key: string): Promise<void> => {
  delete _store[key];
});

/** Test helper — wipe the in-memory store and clear mock call history */
export const __reset = () => {
  Object.keys(_store).forEach((k) => delete _store[k]);
  getItemAsync.mockClear();
  setItemAsync.mockClear();
  deleteItemAsync.mockClear();
};

/** Test helper — seed a value without going through setItemAsync */
export const __set = (key: string, value: string) => {
  _store[key] = value;
};
