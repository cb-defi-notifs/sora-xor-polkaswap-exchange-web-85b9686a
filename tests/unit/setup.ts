const constantDate = new Date(2020, 10, 27, 23, 59, 59);
(global as any).Date = class extends Date {
  constructor() {
    super();
    return constantDate;
  }
};