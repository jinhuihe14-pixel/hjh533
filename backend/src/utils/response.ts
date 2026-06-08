export const success = (data?: any, message: string = '操作成功') => {
  return {
    code: 200,
    message,
    data
  };
};

export const error = (code: number, message: string) => {
  return {
    code,
    message,
    data: null
  };
};

export const paginate = (list: any[], page: number, pageSize: number) => {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const records = list.slice(start, end);
  
  return {
    records,
    total: list.length,
    page,
    pageSize,
    totalPages: Math.ceil(list.length / pageSize)
  };
};
