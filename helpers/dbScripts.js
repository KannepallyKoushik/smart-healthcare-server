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
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await pool.query("Drop table if exists consumer");
    await pool.query("Drop table if exists patient");
    await pool.query("Drop table if exists devices");
    await pool.query("Drop table if exists vital_temperature_sensor");
    await pool.query("Drop table if exists critical_temperature_sensor");
    await pool.query("Drop table if exists critical_bp_sensor");
    await pool.query("Drop table if exists vital_bp_sensor");

    await pool.query(
      "CREATE table patient (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR ( 255 ) NOT NULL,email text UNIQUE NOT NULL ,Age VARCHAR ( 50 ) NOT NULL, Sex VARCHAR ( 50 ) NOT NULL, Smoker BOOLEAN NOT NULL Default FALSE, CigsPerDay INT NOT NULL DEFAULT 0, PrevalentStroke BOOLEAN NOT NULL DEFAULT FALSE, Diabetes BOOLEAN NOT NULL DEFAULT FALSE)"
    );

    await pool.query(
      "CREATE table vital_bp_sensor (vbp_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, systolic_min_bp INT ,systolic_max_bp INT ,systolic_avg_bp INT , systolic_sd_bp INT ,diastolic_min_bp INT, diastolic_max_bp INT, diastolic_avg_bp INT, diastolic_sd_bp INT , heartrate_min INT , heartrate_max INT, heartrate_sd INT ,timestamp text)"
    );

    await pool.query(
      "CREATE table critical_bp_sensor (cbp_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, systolic_critical_score INT ,diastolic_critical_score INT , heartrate_critical_score INT ,timestamp text)"
    );

    await pool.query(
      "CREATE table critical_temperature_sensor (ctemp_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  temperature_critical_score INT ,timestamp text)"
    );

    await pool.query(
      "CREATE table vital_temperature_sensor (vtemp_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, temp_min real ,temp_max real , temp_avg real, temp_sd real ,timestamp text)"
    );

    await pool.query(
      "CREATE table consumer (consumer_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, id uuid, CONSTRAINT fk_patient FOREIGN KEY(id) REFERENCES patient(id), date_of_diagnosis text NOT NULL,vbp_id INT,CONSTRAINT fk_vital_bp_sensor FOREIGN KEY(vbp_id) REFERENCES vital_bp_sensor(vbp_id), cbp_id INT,CONSTRAINT fk_critical_bp_sensor FOREIGN KEY(cbp_id) REFERENCES critical_bp_sensor(cbp_id), ctemp_id INT,CONSTRAINT fk_critical_temperature_sensor FOREIGN KEY(ctemp_id) REFERENCES critical_temperature_sensor(ctemp_id), vtemp_id INT,CONSTRAINT fk_vital_temperature_sensor FOREIGN KEY(vtemp_id) REFERENCES vital_temperature_sensor(vtemp_id) )"
    );

    await pool.query(
      "CREATE table devices (device_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, alias_name text NOT NULL UNIQUE, mac_addr text NOT NULL UNIQUE)"
    );
  } catch (error) {
    console.error(error.message);
  }
}

createTables();
