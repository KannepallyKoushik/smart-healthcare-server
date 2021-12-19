const pool = require("../db");

exports.getAllPatients = async (req, res) => {
  try {
    const patients = await pool.query("SELECT * from patient");

    return res.status(201).json(patients.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send(error.message);
  }
};

exports.register = async (req, res) => {
  try {
    //1. Destructure the req.body (name, email , password)
    const { Name, Age, Sex, email, thyroid, PrevalentStroke, Diabetes } =
      req.body;

    //2. Check if user exists (if user exist then throw error)
    const user = await pool.query("select * from patient where email = $1", [
      email,
    ]);

    if (user.rowCount !== 0) {
      return res.status(405).send("User Already exists");
    }

    //3. Enter the new user into the DB
    const patient = await pool.query(
      "Insert into patient(name , email,age,sex,thyroid,prevalentstroke,diabetes) values($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [Name, email, Age, Sex, thyroid, PrevalentStroke, Diabetes]
    );

    const patient_id = patient.rows[0].id;

    res.status(201).json({
      message: "Successfully Registered Patient",
      patient_id: patient_id,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

exports.getPatientByID = async (req, res) => {
  try {
    //1. Destructure the req.body (name, email , password)
    const { email } = req.body;

    //2. Check if user exists
    const user = await pool.query("select * from patient where email = $1", [
      email,
    ]);

    if (user.rowCount == 0) {
      return res.status(404).send("User Does not exist");
    }

    res.status(200).json(user.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

exports.getPatientData = async (req, res) => {
  try {
    const { patient_id } = req.body;

    const user = await pool.query("select * from patient where id = $1", [
      patient_id,
    ]);
    if (user.rowCount == 0) {
      return res.status(404).send("User Does not exist");
    }

    res.status(200).json(user.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

exports.registerDevice = async (req, res) => {
  try {
    //1. Destructure the req.body
    const { mac_addr, alias_name } = req.body;
    //2. Check if device already exists
    const device = await pool.query(
      "select * from devices where mac_addr = $1 or alias_name=$2",
      [mac_addr, alias_name]
    );
    if (device.rowCount != 0) {
      return res
        .status(400)
        .send("A Device with Same MacAddress or Alias Name Already Exists");
    }

    await pool.query(
      "insert into devices (mac_addr,alias_name) values ($1,$2)",
      [mac_addr, alias_name]
    );

    res.status(200).json({
      message: "Successfully registered the device",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

exports.getAllDevices = async (req, res) => {
  try {
    const devices = await pool.query("select * from devices");

    res.status(200).json(devices.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

exports.deleteDevice = async (req, res) => {
  try {
    var deviceID = req.params.deviceId;

    const device = await pool.query(
      "select * from devices where device_id = $1",
      [deviceID]
    );

    if (device.rowCount == 0) {
      return res.status(404).send("Device Not Found");
    }
    await pool.query("delete from devices where device_id = $1", [deviceID]);

    return res.status(202).send("Device Deleted");
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

exports.verify = async (req, res) => {
  try {
    const { patient_id } = req.body;

    const user = await pool.query("select * from patient where id = $1", [
      patient_id,
    ]);

    if (user.rowCount == 0) {
      return res.status(403).send("No user found");
    }
    res.json(true);
  } catch (error) {
    console.error(error.message);
    res.status(500).send(error.message);
  }
};

exports.manualThyroid_Diabetes_Data = async (req, res) => {
  try {
    const {
      sugar_post_lunch,
      sugar_pre_lunch,
      t3_harmone_value,
      t4_harmone_value,
      tsh_value,
      consumer_id,
    } = req.body;

    var thy_dia = await pool.query(
      "INSERT INTO thyroid_diabetes (sugar_post_lunch , sugar_pre_lunch , t3_harmone_value , t4_harmone_value , tsh_value) VALUES ($1, $2, $3, $4, $5) returning td_id",
      [
        sugar_post_lunch,
        sugar_pre_lunch,
        t3_harmone_value,
        t4_harmone_value,
        tsh_value,
      ]
    );
    thy_dia = thy_dia.rows[0].td_id;

    console.log(thy_dia);
  } catch (error) {
    console.error(error.message);
    res.status(500).send(error.message);
  }
};
