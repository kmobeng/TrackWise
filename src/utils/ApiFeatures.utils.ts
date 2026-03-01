interface Query {
  find: (obj: any) => Query;
  sort: (sortBy: string) => Query;
  skip: (skip: number) => Query;
  limit: (limit: number) => Query;
}

interface QueryString {
  [key: string]: any;
  page?: number | string;
  sort?: string;
  limit?: number | string;
  date?: string | { gte: Date; lte: Date };
}

class APIFeatures {
  query: Query;
  queryString: QueryString;

  constructor(query: Query, queryString: QueryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit"];
    excludedFields.forEach((el) => delete queryObj[el]);

    if (queryObj.date && typeof queryObj.date === "string") {
      const startOfDay = new Date(queryObj.date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(queryObj.date);
      endOfDay.setHours(23, 59, 59, 999);

      queryObj.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-date");
    }
    return this;
  }

  paginate() {
    const page = Number(this.queryString.page ?? 1) || 1;
    const limit = Number(this.queryString.limit ?? 10) || 10;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

export default APIFeatures;
