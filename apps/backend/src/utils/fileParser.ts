import pdf from 'pdf-parse';

export const parseFileContent = async (file: Express.Multer.File): Promise<string> => {
  if (file.mimetype === 'text/plain') {
    return file.buffer.toString('utf-8');
  } else if (file.mimetype === 'application/pdf') {
    const data = await pdf(file.buffer);
    return data.text;
  }
  throw new Error('Unsupported file type. Only .txt and .pdf are supported.');
};
