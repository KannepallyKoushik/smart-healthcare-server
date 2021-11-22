const Pool = require("pg").Pool;

const pool = new Pool({
  user: "postgres",
  password: "postgres",
  host: "localhost",
  post: 5432,
  database: "smart_healthcare",
});

async function createTables() {
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";");
    await pool.query("Drop table if exists blood_pressure");
    await pool.query("Drop table if exists consumer");
    await pool.query("Drop table if exists patient");

    await pool.query(
      "CREATE table patient (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR ( 255 ) NOT NULL,email text UNIQUE NOT NULL ,Age VARCHAR ( 50 ) NOT NULL, Sex VARCHAR ( 50 ) NOT NULL, Smoker BOOLEAN NOT NULL Default FALSE, CigsPerDay INT NOT NULL DEFAULT 0, PrevalentStroke BOOLEAN NOT NULL DEFAULT FALSE, Diabetes BOOLEAN NOT NULL DEFAULT FALSE)"
    );

    await pool.query(
      "CREATE table consumer (consumer_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, id uuid, CONSTRAINT fk_patient FOREIGN KEY(id) REFERENCES patient(id), timestamp text NOT NULL)"
    );

    await pool.query(
      "CREATE table blood_pressure (bp_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, consumer_id INT, CONSTRAINT fk_consumer FOREIGN KEY(consumer_id) REFERENCES consumer(consumer_id), systolic_bp INT , diastolic_bp INT , unit VARCHAR (50) DEFAULT 'mmHg', date_time text)"
    );
  } catch (error) {
    console.error(error.message);
  }
}

createTables();
