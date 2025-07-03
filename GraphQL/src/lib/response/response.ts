export const positiveResponse = (
  message: string,
  data?: { [key: string]: any }
) => {
  const object: { status: true; message: string; [key: string]: any } = {
    status: true,
    message,
  };
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      object[key] = value;
    }
  }
  return object;
};

export const negativeResponse = (
  message: string,
  data?: { [key: string]: any }
) => {
  const object: { status: boolean; message: string; [key: string]: any } = {
    status: false,
    message,
  };
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      object[key] = value;
    }
  }
  return object;
};
