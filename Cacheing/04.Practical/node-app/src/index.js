const express = require("express");
const Redis = require("ioredis");

const redis = new Redis({
  host: "redis",
  port: 6379,
});

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cache = {
  get: async (key) => {
    const value = await redis.get(key);
    return value;
  },
  set: async (key, value) => {
    await redis.set(`user:${key}`, value);
  },
  del: async (key) => {
    await redis.del(key);
  },
  keys: async (pattern) => {
    const keys = await redis.keys(pattern);
    return keys;
  },
};

const getUserFromDB = async (id) => {
  return {
    id,
    name: "John Doe",
    phone: "01732461622",
    age: 30,
  };
};

const getUser = async (id) => {
  let user = await cache.get(id);
  if (user) {
    return JSON.parse(user);
  }
  user = await getUserFromDB(id);
  await cache.set(id, JSON.stringify(user));

  // get user from redis
  const getUsers = await cache.get(id);

  return { user, getUsers };
};

app.get("/", (req, res) => {
  const { getUsers } = getUser();
  res.status(200).json("Hello World!", getUsers);
});

app.post("/add-user", async (req, res) => {
  try {
    const { id, ...data } = req.body;
    if (!id) {
      return res.status(400).json({ message: "User ID is required" });
    }
    await cache.set(id, JSON.stringify(data), { EX: 3600 });
    res.status(200).json({ message: "User added successfully" });
  } catch (err) {
    console.error("Redis error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/get-user/:id", async (req, res) => {
  // first check if user exists in the cache or not
  const { id } = req.params;
  const user = await getUser(id);
  // if not exist then get from database
  res.status(200).json(user);
});

app.get("/all-users", async (req, res) => {
  try {
    const keys = await cache.keys("*");
    const values = await Promise.all(
      keys.map(async (key) => {
        const value = await cache.get(key);
        return { key, value: JSON.parse(value) };
      })
    );
    res.status(200).json(values);
  } catch (err) {
    console.error("Redis error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/delete-user/:id", async (req, res) => {
  const { id } = req.params;
  const user = await cache.get(id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  await cache.del(id);
  res.status(200).json({ message: "User deleted successfully" });
});

app.listen(8002, () => {
  console.log("Server is running on port 8002");
});
