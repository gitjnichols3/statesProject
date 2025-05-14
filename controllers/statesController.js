const Statesdb = require('../model/Statesdb');

const data = {
    states: require('../model/statesData.json'),
    setStates: function (data) { this.states = data }
}

//get a random funfact

const getRandomFunfact = async (req, res) => {
  const stateCode = req.params.state.toUpperCase();

  const stateFromJson = data.states.find(
    state => state.code === stateCode
  );

  if (!stateFromJson) {
    return res.status(400).json({ message: 'Invalid state abbreviation parameter' });
  }

  try {
    const foundState = await Statesdb.findOne({ stateCode });

    if (!foundState || !foundState.funfacts || foundState.funfacts.length === 0) {
      return res.status(404).json({
        message: `No Fun Facts found for ${stateFromJson.state}`
      });
    }

    const randomIndex = Math.floor(Math.random() * foundState.funfacts.length);
    const randomFunfact = foundState.funfacts[randomIndex];

    res.status(200).json({ funfact: randomFunfact });

  } catch (err) {
    res.status(500).json({ message: "Error fetching random funfact", error: err });
  }
};


//delete funfact by state by array index


const deleteFunfactFromState = async (req, res) => {
  const stateCode = req.params.state.toUpperCase();
  const { index } = req.body;

  if (!index) {
    return res.status(400).json({ message: 'State fun fact index value required' });
  }

  const adjustedIndex = parseInt(index, 10) - 1;

  const stateData = data.states.find(state => state.code === stateCode);
  const stateName = stateData?.state || stateCode;

  try {
    const foundState = await Statesdb.findOne({ stateCode });

    if (!foundState || !Array.isArray(foundState.funfacts) || foundState.funfacts.length === 0) {
      return res.status(404).json({ message: `No Fun Facts found for ${stateName}` });
    }

    if (adjustedIndex < 0 || adjustedIndex >= foundState.funfacts.length) {
      return res.status(400).json({ message: `No Fun Fact found at that index for ${stateName}` });
    }

    foundState.funfacts.splice(adjustedIndex, 1);

    const updatedState = await foundState.save();
    res.status(200).json(updatedState);

  } catch (err) {
    res.status(500).json({ message: 'Error deleting funfact', error: err.message });
  }
};


//uses patch to replace one funfact with another based on array index value

const patchFunfact = async (req, res) => {
  const stateCode = req.params.state.toUpperCase();
  const { index, funfact } = req.body;

  if (index === undefined) {
    return res.status(400).json({ message: 'State fun fact index value required' });
  }

  if (!funfact || typeof funfact !== 'string') {
    return res.status(400).json({ message: 'State fun fact value required' });
  }

  const adjustedIndex = parseInt(index, 10) - 1;

  try {
    const foundState = await Statesdb.findOne({ stateCode });

    const jsonState = data.states.find(st => st.code === stateCode);
    if (!jsonState) {
      return res.status(404).json({ message: 'Invalid state abbreviation parameter' });
    }
    
    if (!foundState || !Array.isArray(foundState.funfacts) || foundState.funfacts.length === 0) {
      return res.status(404).json({ message: `No Fun Facts found for ${jsonState.state}` });
    }
    

    if (!foundState.funfacts || foundState.funfacts.length === 0) {
      const fullState = data.states.find(st => st.code === stateCode);
      const stateName = fullState?.state || stateCode;
      return res.status(404).json({ message: `No Fun Facts found for ${stateName}` });
    }

    if (adjustedIndex < 0 || adjustedIndex >= foundState.funfacts.length) {
      const fullState = data.states.find(st => st.code === stateCode);
      const stateName = fullState?.state || stateCode;
      return res.status(400).json({ message: `No Fun Fact found at that index for ${stateName}` });
    }

    foundState.funfacts[adjustedIndex] = funfact;
    const updatedState = await foundState.save();
    res.status(200).json(updatedState);

  } catch (err) {
    res.status(500).json({ message: 'Error updating fun fact', error: err.message });
  }
};



//Posts a funfact to a new stateCode in MongoDB. Used to set up initial data using ThunderClient.

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



//Add funfact to a specific state by stateCode.

const addFunfactToState = async (req, res) => {
  const stateCode = req.params.state.toUpperCase(); 
  const { funfacts } = req.body; 

  if (!funfacts) {
      return res.status(400).json({ message: 'State fun facts value required' });
  }

  if (!Array.isArray(funfacts)) {
      return res.status(400).json({ message: 'State fun facts value must be an array' });
  }

  try {
      let foundState = await Statesdb.findOne({ stateCode });

      if (!foundState) {
          foundState = new Statesdb({ stateCode, funfacts });
      } else {
          foundState.funfacts.push(...funfacts);
      }

      const updatedState = await foundState.save();
      res.status(200).json(updatedState); 
  } catch (err) {
      console.error("Error adding funfacts to state:", err);
      res.status(500).json({ message: "Error adding funfacts to state", error: err });
  }
};


// Gets all state info. Also filters based on contig param for contiguous or island states. I thought it said "config" for the longest time. Tough to troubleshoot.

const getAllStates = async (req, res) => {
  const { contig } = req.query;

  try {
      const allFunfacts = await Statesdb.find();

      const funfactMap = {};
      allFunfacts.forEach(entry => {
          if (entry.funfacts?.length > 0) {
              funfactMap[entry.stateCode] = entry.funfacts;
          }
      });

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

//gets data for a specific state based on state code - Merges MongoDB with JSON

const getStateByParam = async (req, res) => {
  const stateParam = req.params.state.toUpperCase();

  const jsonState = data.states.find(state => state.code === stateParam);
  if (!jsonState) {
      return res.status(404).json({ message: `Invalid state abbreviation parameter` });
  }

  try {
      const mongoState = await Statesdb.findOne({ stateCode: stateParam });
      const mergedState = { ...jsonState };
      if (mongoState?.funfacts?.length > 0) {
          mergedState.funfacts = mongoState.funfacts;
      }

      res.json(mergedState);
  } catch (err) {
      res.status(500).json({ message: 'Server error retrieving state data.', error: err });
  }
};


//Finds the state name and capital based on state code in the URL.

const getStateCapitalByParam = (req, res) => {
    const stateParam = req.params.state.toLowerCase();
  
    const foundState = data.states.find(
      state =>
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
        state.code?.toLowerCase() === stateParam
    );
  
    if (!foundState) {
      return res.status(404).json({ message: `Invalid state abbreviation parameter` });
    }
  
    res.json({ state: foundState.state, nickname: foundState.nickname });
  };


//Finds the state population based on state code in URL

const getStatePopulationByParam = (req, res) => {
    const stateParam = req.params.state.toLowerCase();
  
    const foundState = data.states.find(
      state =>
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
        state.code?.toLowerCase() === stateParam
    );
  
    if (!foundState) {
      return res.status(404).json({ message: `Invalid state abbreviation parameter` });
    }
  
    res.json({ state: foundState.state, admitted: foundState.admission_date });
  };


// Not needed. I started out by emulating Employees from the tutorials. This would create a new state. Canada? Greenland?

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


// Same. Not needed. Emulated from Employees.

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

// Same. I hope we don't need to delete a state. Although California ...

const deleteState = (req, res) => {
    const state = data.states.find(stt => stt.admission_number === parseInt(req.body.admission_number));
    if (!state) {
        return res.status(400).json({ "message" : `State admission number ${req.body.admission_number} not found` });
    }
    const filteredArray = data.states.filter(stt => stt.admission_number !== parseInt(req.body.admission_number));
    data.setStates([...filteredArray]);
    res.json(data.states);
}

// Same. Initial get state attempt based on admin number I was going to use as an id before studying project reqs.

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
