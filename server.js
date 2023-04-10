const express = require("express");
const axios = require("axios");
const redis = require("redis");

const app = express();

const PORT = process.env.PORT || 3000;

let redisClient;

(async () => {
  redisClient = redis.createClient();

  redisClient.on("error", (error) => console.error(`Error : ${error}`));

  await redisClient.connect();
})();

async function fetchApiData(species) {
  const apiResponse = await axios.get(
    `https://www.fishwatch.gov/api/species/${species}`
  );
  console.log(apiResponse.data);

  return apiResponse.data;
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/fish/:species", async (req, res) => {
  const species = req.params.species;
  let isCached = false;
  try {
    const cachedData = await redisClient.get(species);
    if (cachedData) {
      isCached = true;
      res.send({
        fromCache: true,
        data: JSON.parse(cachedData),
      });
    } else {
      const data = await fetchApiData(species);

      if (data.length == 0) {
        throw "API returned an empty array";
      }
      await redisClient.set(species, JSON.stringify(data));
      res.send({
        fromCache: false,
        data: data,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(404).send({
      fromCache: false,
      error: error,
    });
  }
});
