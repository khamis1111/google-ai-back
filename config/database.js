import { mongoose } from "mongoose";

const database = () =>
  mongoose
    .connect(process.env.MONGO_URL)
    .then((res) => console.log(`Database Connected ${res.connection.name}`))
    .catch((errr) => console.log(errr));

export default database;
