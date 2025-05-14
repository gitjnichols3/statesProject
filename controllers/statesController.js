const Statesdb = require('../model/Statesdb');

const data = {
    states: require('../model/statesData.json'),
    setStates: function (data) { this.states = data }
}
//test
const getRandomFunfact = async (req, res) => {
  const stateCode = req.params.state.toUpperCase();

  // Check if it's a valid state code using your JSON
  const stateFromJson = data.states.find(
    state => state.code === stateCode
  );

  if (!stateFromJson) {
    return res.status(400).json({ message: 'Invalid state abbreviation parameter' });
  }

  try {
    // Now check if funfacts exist in MongoDB
    const foundState = await Statesdb.findOne({ stateCode });

    if (!foundState || !foundState.funfacts || foundState.funfacts.length === 0) {
      return res.status(404).json({
        message: `No Fun Facts found for ${stateFromJson.state}`
      });
    }

    // Randomly select a funfact
    const randomIndex = Math.floor(Math.random() * foundState.funfacts.length);
    const randomFunfact = foundState.funfacts[randomIndex];

    res.status(200).json({ funfact: randomFunfact });

  } catch (err) {
    res.status(500).json({ message: "Error fetching random funfact", error: err });
  }
};



const deleteFunfactFromState = async (req, res) => {
  const stateCode = req.params.state.toUpperCase();
  const { index } = req.body;

  if (!index) {
      return res.status(400).json({ message: 'Index is required.' });
  }

  const adjustedIndex = parseInt(index, 10) - 1; // Adjust for zero-based index

  try {
      const foundState = await Statesdb.findOne({ stateCode });

      if (!foundState) {
          return res.status(404).json({ message: `State with code '${stateCode}' not found.` });
      }

      if (!foundState.funfacts || foundState.funfacts.length === 0) {
          return res.status(404).json({ message: `No Fun Facts found for ${stateCode}` });
      }

      if (adjustedIndex < 0 || adjustedIndex >= foundState.funfacts.length) {
          return res.status(400).json({ message: `Fun Fact index ${index} out of range.` });
      }

      // Remove the item at the adjusted index
      foundState.funfacts.splice(adjustedIndex, 1);

      const updatedState = await foundState.save();
      res.status(200).json(updatedState);
  } catch (err) {
      res.status(500).json({ message: "Error deleting funfact", error: err.message });
  }
};


const patchFunfact = async (req, res) => {
  const stateCode = req.params.state.toUpperCase();
  const { index, funfact } = req.body;

  // Check for required fields
  if (!index || !funfact) {
    return res.status(400).json({ message: 'Both index and funfact are required.' });
  }

  // Adjust for 1-based index
  const adjustedIndex = parseInt(index, 10) - 1;

  try {
    const foundState = await Statesdb.findOne({ stateCode });

    if (!foundState) {
      return res.status(404).json({ message: `State with code '${stateCode}' not found.` });
    }

    if (!Array.isArray(foundState.funfacts) || adjustedIndex < 0 || adjustedIndex >= foundState.funfacts.length) {
      return res.status(400).json({ message: `No fun fact found at index ${index}.` });
    }

    foundState.funfacts[adjustedIndex] = funfact;

    const updatedState = await foundState.save();
    res.json(updatedState);

  } catch (err) {
    res.status(500).json({ message: 'Error updating fun fact.', error: err.message });
  }
};






const postStateFunfact = async (req, res) => {
  const { stateCode, funfact } = req.body;

  if (!stateCode || !funfact) {
      return res.status(400).json({ message: 'Both stateCode and funfact are required.' });
  }

  try {
      const newEntry = new Statesdb({
          stateCode,
          funfacts: [funfact]
      });

      const saved = await newEntry.save();
      res.status(201).json(saved);
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
};

const addFunfactsToState = async (req, res) => {
  const stateCode = req.params.state.toUpperCase();
  const { funfacts } = req.body;

  // Check if funfacts is provided
  if (!funfacts) {
      return res.status(400).json({ message: 'State fun facts value required' });
  }

  // Check if it's an array
  if (!Array.isArray(funfacts)) {
      return res.status(400).json({ message: 'State fun facts value must be an array' });
  }

  try {
      const foundState = await Statesdb.findOne({ stateCode });

      // If no document in MongoDB, create one
      if (!foundState) {
          const newState = await Statesdb.create({
              stateCode,
              funfacts: funfacts
          });
          return res.status(201).json({
              ...getBaseStateData(stateCode),
              funfacts: newState.funfacts
          });
      }

      // Append new funfacts to existing ones
      foundState.funfacts.push(...funfacts);
      const updatedState = await foundState.save();

      res.status(200).json({
          ...getBaseStateData(stateCode),
          funfacts: updatedState.funfacts
      });

  } catch (err) {
      res.status(500).json({ message: 'Error adding fun facts', error: err });
  }
};




/* const addFunfactToState = async (req, res) => {
  const stateCode = req.params.state.toUpperCase(); // Get stateCode from URL params
  const { funfact } = req.body; // Get funfact from the request body

  console.log("Looking for state with code:", stateCode);
  console.log("Funfact to add:", funfact);

  // Validate that 'funfact' is provided
  if (!funfact) {
      return res.status(400).json({ 'message': 'Funfact is required.' });
  }

  try {
      // Find the state by its stateCode
      const foundState = await Statesdb.findOne({ stateCode: stateCode });
      console.log("Found state:", foundState);

      if (!foundState) {
          return res.status(404).json({ 'message': `State with code '${stateCode}' not found.` });
      }

      // Add the new funfact to the state's funfacts array
      foundState.funfacts.push(funfact);

      // Save the updated state
      const updatedState = await foundState.save();

      // Return the updated state
      res.status(200).json(updatedState);

  } catch (err) {
      console.error("Error adding funfact to state:", err);  // Log the error for debugging
      res.status(500).json({ message: "Error adding funfact to state", error: err });
  }
}; */

const getAllStates = async (req, res) => {
  const { contig } = req.query;

  try {
      // Get all funfacts from MongoDB once (more efficient)
      const allFunfacts = await Statesdb.find();

      // Create a map for quick lookup by stateCode
      const funfactMap = {};
      allFunfacts.forEach(entry => {
          if (entry.funfacts?.length > 0) {
              funfactMap[entry.stateCode] = entry.funfacts;
          }
      });

      // Filter based on config query param
      let filteredStates = data.states;
      if (contig === 'true') {
          filteredStates = filteredStates.filter(
              state => state.state !== 'Alaska' && state.state !== 'Hawaii'
          );
      } else if (contig === 'false') {
          filteredStates = filteredStates.filter(
              state => state.state === 'Alaska' || state.state === 'Hawaii'
          );
      }

      // Merge in funfacts (only if they exist)
      const mergedStates = filteredStates.map(state => {
          const merged = { ...state };
          const facts = funfactMap[state.code];
          if (facts) {
              merged.funfacts = facts;
          }
          return merged;
      });

      res.json(mergedStates);
  } catch (err) {
      res.status(500).json({ message: 'Error retrieving states.', error: err });
  }
};


/* const getAllStates = (req,res) => {
    const { config } = req.query;
    
    if (config === 'true') {
        // Return only states excluding Alaska and Hawaii
        const contiguousStates = data.states.filter(
          state => state.state !== 'Alaska' && state.state !== 'Hawaii'
        );
        return res.json(contiguousStates);
      } else if (config === 'false') {
        // Return only Alaska and Hawaii
        const nonContiguousStates = data.states.filter(
          state => state.state === 'Alaska' || state.state === 'Hawaii'
        );
        return res.json(nonContiguousStates);
      } 

      res.json(data.states);
} */


const getStateByParam = async (req, res) => {
  const stateParam = req.params.state.toUpperCase();

  // 1. Find JSON record
  const jsonState = data.states.find(state => state.code === stateParam);
  if (!jsonState) {
      return res.status(404).json({ message: `Invalid state abbreviation parameter` });
  }

  try {
      // 2. Get funfacts from MongoDB
      const mongoState = await Statesdb.findOne({ stateCode: stateParam });

      // 3. Start with a shallow copy of the JSON data
      const mergedState = { ...jsonState };

      // 4. Add funfacts only if they exist and are non-empty
      if (mongoState?.funfacts?.length > 0) {
          mergedState.funfacts = mongoState.funfacts;
      }

      res.json(mergedState);
  } catch (err) {
      res.status(500).json({ message: 'Server error retrieving state data.', error: err });
  }
};


/* const getStateByParam = (req, res) => {
    const stateParam = req.params.state.toLowerCase();
  
    const foundState = data.states.find(
      state =>
        //state.state.toLowerCase() === stateParam ||   (Instuctions show name should result in 404)
        state.code?.toLowerCase() === stateParam
    );
  
    if (!foundState) {
      return res.status(404).json({ message: `State '${req.params.state}' not found. Use state code - 2 letter abbreviation` });
    }
  
    res.json(foundState);
  }; */


const getStateCapitalByParam = (req, res) => {
    const stateParam = req.params.state.toLowerCase();
  
    const foundState = data.states.find(
      state =>
        //state.state.toLowerCase() === stateParam ||   (Instuctions show name should result in 404)
        state.code?.toLowerCase() === stateParam
    );
  
    if (!foundState) {
      return res.status(404).json({ message: `Invalid state abbreviation parameter` });
    }
  
    res.json({ state: foundState.state, capital: foundState.capital_city });
  };

  const getStateNicknameByParam = (req, res) => {
    const stateParam = req.params.state.toLowerCase();
  
    const foundState = data.states.find(
      state =>
        //state.state.toLowerCase() === stateParam ||   (Instuctions show name should result in 404)
        state.code?.toLowerCase() === stateParam
    );
  
    if (!foundState) {
      return res.status(404).json({ message: `Invalid state abbreviation parameter` });
    }
  
    res.json({ state: foundState.state, nickname: foundState.nickname });
  };


const getStatePopulationByParam = (req, res) => {
    const stateParam = req.params.state.toLowerCase();
  
    const foundState = data.states.find(
      state =>
        //state.state.toLowerCase() === stateParam ||   (Instuctions show name should result in 404)
        state.code?.toLowerCase() === stateParam
    );
  
    if (!foundState) {
      return res.status(404).json({ message: `Invalid state abbreviation parameter` });
    }
  
    res.json({ state: foundState.state, population: foundState.population.toLocaleString() });
  };

  const getStateAdmissionByParam = (req, res) => {
    const stateParam = req.params.state.toLowerCase();
  
    const foundState = data.states.find(
      state =>
        //state.state.toLowerCase() === stateParam ||   (Instuctions show name should result in 404)
        state.code?.toLowerCase() === stateParam
    );
  
    if (!foundState) {
      return res.status(404).json({ message: `Invalid state abbreviation parameter` });
    }
  
    res.json({ state: foundState.state, admitted: foundState.admission_date });
  };


const createNewState = (req, res) => {

    const maxAdmissionNumber = data.states.reduce((max, st) => {
        return st.admission_number > max ? st.admission_number : max;
    }, 0);

    const newState = {
        admission_number: maxAdmissionNumber + 1,
        state: req.body.state,
        nickname: req.body.nickname
    }

    if (!newState.state || !newState.nickname) {
        return res.status(400).json({ 'message': 'Invalid state abbreviation parameter' });
    }

    data.setStates([...data.states, newState]);
    res.status(201).json(data.states);
}


const updateState = (req, res) => {
    const state = data.states.find(stt => stt.admission_number === parseInt(req.body.admission_number));
    if (!state) {
        return res.status(400).json({ "message" : `State admission number ${req.body.admission_number} not found` });
    }
    if (req.body.state) state.state = req.body.state;
    if (req.body.nickname) state.nickname = req.body.nickname;
    const filteredArray = data.states.filter(stt => stt.admission_number !== parseInt(req.body.admission_number));
    const unsortedArray = [...filteredArray, state];
    data.setStates(unsortedArray.sort((a, b) => a.state > b.state ? 1 : a.state < b.state ? -1 : 0 ));
    res.json(data.states);
}

const deleteState = (req, res) => {
    const state = data.states.find(stt => stt.admission_number === parseInt(req.body.admission_number));
    if (!state) {
        return res.status(400).json({ "message" : `State admission number ${req.body.admission_number} not found` });
    }
    const filteredArray = data.states.filter(stt => stt.admission_number !== parseInt(req.body.admission_number));
    data.setStates([...filteredArray]);
    res.json(data.states);
}


const getState = (req, res) => {
    const state = data.states.find(stt => stt.admission_number === parseInt(req.params.admission_number));
    if (!state) {
        return res.status(400).json({ "message" : `State admission number ${req.params.admission_number} not found` });
    }
    res.json(state);
}

module.exports = {
    getAllStates,
    createNewState,
    updateState,
    deleteState,
    getState,
    getStateByParam,
    getStateCapitalByParam,
    getStateNicknameByParam,
    getStatePopulationByParam,
    getStateAdmissionByParam,
    addFunfactToState,
    postStateFunfact,
    patchFunfact,
    deleteFunfactFromState,
    getRandomFunfact
}
