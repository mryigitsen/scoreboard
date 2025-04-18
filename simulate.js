// The Instruction Class, store the information about the instructions which
// the simulator can execute.
function Instruction(Op, dest, source_1, source_2) {
    this.Op = Op;
    this.dest = dest;
    this.source_1 = source_1;
    this.source_2 = source_2;
    this.state = 0; // 0: not run, 1: running, 2: finished 
    this.stage = ["", "", "", ""];
}

// The Instruction Class compare function.
Instruction.compare = function (instruction_1, instruction_2) {
    if (!instruction_1 && !instruction_2) return true;
    if (!instruction_1 || !instruction_2) return false;
    if (instruction_1.Op !== instruction_2.Op) return false;
    if (instruction_1.dest !== instruction_2.dest) return false;
    if (instruction_1.source_1 !== instruction_2.source_1) return false;
    return instruction_1.source_2 === instruction_2.source_2;
}

// Get the issue time of the instruction
Instruction.prototype.issueTime = function () {
    return Number(this.stage[0]);
}

// Return the instruction information.
Instruction.prototype.toString = function () {
    let temp = "Op: " + this.Op + " dest: " + this.dest + " ";
    temp += "source_1: " + this.source_1 + " source_2: " + this.source_2 + " ";
    temp += "state: " + this.state;
    temp += this.stage;
    return temp;
}

// Format the original instruction style. OP DST SRC1 SRC2
Instruction.prototype.getSource = function () {
    return this.Op + " " + this.dest + " " + this.source_1 + " " + this.source_2;
}

// Set the instruction to issue stage
Instruction.prototype.setIssue = function (clock) {
    this.state = 1;
    this.stage[0] = clock + "";
}

// Set the instruction to operand stage
Instruction.prototype.setOperand = function (clock) {
    this.stage[1] = clock + "";
}

// Set the instruction to exec stage
Instruction.prototype.setExec = function (clock) {
    this.stage[2] = clock + "";
}

// Set the instruction to write stage
Instruction.prototype.setWrite = function (clock) {
    this.state = 2;
    this.stage[3] = clock + "";
}

// Judge whether the instruction is running
Instruction.prototype.isRunning = function () {
    return this.state >= 1;
}

// Judge whether the instruction is finished.
Instruction.prototype.isFinished = function () {
    return this.state === 2;
}

/*
 * The FunctionUint Class, provide the information about the function unit
 * and the operation of the function unit.
 */
function FunctionUnit(name, execTime) {
    this.name = name;
    this.busy = false;
    this.Op = "";
    this.Fi = "";
    this.Fj = "";
    this.Fk = "";
    this.Qj = "";
    this.Qk = "";
    this.Rj = true;
    this.Rk = true;
    this.exec = 0;
    this.execTime = execTime;   // The clock need in execution stage.
    this.execStart = 0; // The start time of current instruction.
    this.currentInstruction = null; // The current executing instruction.
}

// For print the function unit information.
FunctionUnit.prototype.toString = function () {
    let temp = "name: " + this.name + " Op: " + this.Op + " ";
    temp += "Fi: " + this.Fi + " Fj: " + this.Fj + " ";
    temp += "Fk: " + this.Fk + " Qj: " + this.Qj + " ";
    temp += "Qk: " + this.Qk + " Rj: " + this.Rj + " ";
    temp += "Rk: " + this.Rk + " exec: " + this.exec;
    if (this.currentInstruction) {
        temp += " instruction: " + this.currentInstruction.Op;
    }
    return temp;
}

// Clear the information of function unit, this will be occured when the 
// instruction is finished.
FunctionUnit.prototype.clear = function () {
    this.busy = false;
    this.Op = "";
    this.Fi = "";
    this.Fj = "";
    this.Fk = "";
    this.Qj = "";
    this.Qk = "";
    this.Rj = true;
    this.Rk = true;
    this.exec = 0;
    this.execStart = 0;
    this.currentInstruction = null;
}

// Load instruction into the function unit
FunctionUnit.prototype.loadInstruction = function (instruction, registers,
                                                   clock) {
    // If the function unit is running it cannot load the instruction.
    if (this.exec !== 0) {
        return false;
    }
    // If the instruction dest register is occupied, it cannot be issued for WRW.
    if (registers[instruction.dest].state) {
        return false;
    }

    // Issue the instruction and init the function unit and register.
    instruction.setIssue(clock);
    this.currentInstruction = instruction;
    this.busy = true;
    this.exec = 1;
    this.Op = instruction.Op;
    this.Fi = instruction.dest;
    registers[instruction.dest].manipulation = this.name;
    registers[instruction.dest].state = true;
    // The operand info
    if (!!registers[instruction.source_1]) {
        this.Fj = instruction.source_1;
        registers[this.Fj].read = clock;
        if (registers[this.Fj].state === false) {
            this.Rj = true;
            this.Qj = "";
        } else {
            this.Rj = false;
            this.Qj = registers[this.Fj].manipulation;
        }
    }
    if (!!registers[instruction.source_2]) {
        this.Fk = instruction.source_2;
        registers[this.Fk].read = clock;
        if (registers[this.Fk].state === false) {
            this.Rk = true;
            this.Qk = "";
        } else {
            this.Rk = false;
            this.Qk = registers[this.Fk].manipulation;
        }
    }
    return true;
}


// Update the Function unit
FunctionUnit.prototype.forwardPipeline = function (registers, clock) {
    // The function unit didn't need to forward
    if (this.exec === 0 || this.exec === 5) {
        return;
    }
    // If the operands is ready, then forward the function unit.
    if (this.Rj && this.Rk) {
        // Run the instruction first after the function unit ready, and write
        // back in the next circle.
        switch (this.exec){
            case 1:  // current exec: ID1 stage
                this.currentInstruction.setOperand(clock);
                this.exec++;  // ID1->ID2 stage
                this.execStart = clock;
                // Set the register(source 1) in unread state
                if (registers[this.Fj] &&
                    this.currentInstruction.issueTime() === registers[this.Fj].read) {
                    registers[this.Fj].read = 0;
                }
                // Set the register(source 2) in unread state
                if (registers[this.Fk] &&
                    this.currentInstruction.issueTime() === registers[this.Fk].read) {
                    registers[this.Fk].read = 0;
                }
                break;
            case 2:  // current exec: ID2 stage
                this.currentInstruction.setExec(clock);
                // The operand stage must last the number of clock which is given.
                if (clock - this.execStart >= this.execTime) {
                    this.exec++;  // ID2 --> EX
                }
                break;
            case 3:  // current exec: EX stage
                this.currentInstruction.setWrite(clock);
                // The instruction can write the register fulfill the condition that
                // there is no other instruct need to read the register which issue
                // before is.
                if (registers[this.Fi].read === 0 ||
                    this.currentInstruction.issueTime() < registers[this.Fi].read) {
                    this.exec++;  // EX --> WB
                    registers[this.Fi].clear();
                }
                break;
            case 4:  // current exec: WB stage
                this.clear();
        }
    }else{
        console.log(`not ready Rj/Rk: clock:${clock}`)
    }
}

// Update the blocked function unit Fi, Fj.
FunctionUnit.prototype.updateInfo = function (registers) {
    if (this.exec !== 1) {
        return;
    }
    if (this.Rj && this.Rk) {
        return;
    }
    if (!this.Rj && !registers[this.Fj].state) {
        this.Qj = "";
        this.Rj = true;
    }
    if (!this.Rk && !registers[this.Fk].state) {
        this.Qk = "";
        this.Rk = true;
    }
}

/*
 * The Register Class store the information about the instruction and so on.
 */
function Register(name) {
    this.state = false; // false: not busy, true: busy
    this.manipulation = "";
    this.read = 0; // the instruction which read this register issue time
}

// Print the register info.
Register.prototype.toString = function () {
    return "state: " + this.state + " manipulation: " + this.manipulation;
}

// Clear the register info for next write.
Register.prototype.clear = function () {
    this.state = false;
    this.manipulation = "";
}

/*
 * The Controller Class is the controller of the simulator, which manage the
 * function unit, registers, instructions and clock.
 */
function Controller(instructions) {
    this.clock = 0;     // The system clock.
    this.maxFetchSize = 10;     //The max instruction the simulator can run in a time.
    this.instructions = instructions;   // The instruct need to be exec.
    this.fetched = [];  // The ready and running instruction.
    // The function units of this simulator.
    this.functionUnitSet = {
        "Integer": new FunctionUnit("Integer", 1),
        "Mult1": new FunctionUnit("Mult1", 10),
        "Mult2": new FunctionUnit("Mult2", 10),
        "Add1": new FunctionUnit("Add1", 2),
        "Add2": new FunctionUnit("Add2", 2),
        "Divide": new FunctionUnit("Divide", 40)
    };
    // Instruction's correspond function unit.
    this.opToFunctionUnit = {
        "LD": ["Integer"],
        "MULT": ["Mult1", "Mult2"],
        "SUBD": ["Add1", "Add2"],
        "DIVD": ["Divide"],
        "ADDD": ["Add1", "Add2"]
    }
    // The registers of this simulator.
    this.registers = {
        "F0": new Register(), "F1": new Register(), "F2": new Register(),
        "F3": new Register(), "F4": new Register(), "F5": new Register(),
        "F6": new Register(), "F7": new Register(), "F8": new Register(),
        "F9": new Register(), "F10": new Register(), "F11": new Register(),
        "F12": new Register(), "F13": new Register(), "F14": new Register(),
        "F15": new Register(), "F16": new Register(), "F17": new Register(),
        "F18": new Register(), "F19": new Register(), "F20": new Register(),
        "F21": new Register(), "F22": new Register(), "F23": new Register(),
        "F24": new Register(), "F25": new Register(), "F26": new Register(),
        "F27": new Register(), "F28": new Register(), "F29": new Register(),
        "F30": new Register(), "F31": new Register(), "R0": new Register(),
        "R1": new Register(), "R2": new Register(), "R3": new Register(),
        "R4": new Register(), "R5": new Register(), "R6": new Register(),
        "R7": new Register(), "R8": new Register(), "R9": new Register(),
        "R10": new Register(), "R11": new Register(), "R12": new Register(),
        "R13": new Register(), "R14": new Register(), "R15": new Register(),
        "R16": new Register(), "R17": new Register(), "R18": new Register(),
        "R19": new Register(), "R20": new Register(), "R21": new Register(),
        "R22": new Register(), "R23": new Register(), "R24": new Register(),
        "R25": new Register(), "R26": new Register(), "R27": new Register(),
        "R28": new Register(), "R29": new Register(), "R30": new Register(),
        "R31": new Register()
    }
}

// Judge the instruction whether in the simulator's instruction set.
Controller.prototype.isInInstructionSet = function (op) {
    return !!this.opToFunctionUnit[op];
}

// Fetch an instruction into the ready and running queue.
// If the number of instructions of this simulator is run is lower than the
// number which is given, add it.
Controller.prototype.fetchInstruction = function () {
    const temp = this.instructions.shift();
    const count = this.fetched.filter(function (element) {
        return !element.isFinished();
    }).length;
    if (temp && count < this.maxFetchSize) {
        this.fetched.push(temp);
    }
}

// Add an instruction into the simulator instructions set.
Controller.prototype.addInstruction = function (instruction) {
    this.instructions.push(instruction);
}

// Get the instructions which is not in the ready and running queue.
Controller.prototype.getNotExecInstruction = function () {
    return this.instructions;
}

// For print the controller information.
Controller.prototype.toString = function () {
    let key;
    let temp = "Instructions: \n";
    this.instructions.forEach(function (element) {
        temp += element.toString() + "\n";
    });
    temp += "\nfetched_instructions: \n";
    this.fetched.forEach(function (element) {
        temp += element.toString() + "\n";
    });
    temp += "\nFunction unit: \n";
    for (key in this.functionUnitSet) {
        temp += this.functionUnitSet[key].toString() + "\n";
    }
    temp += "\nRegisters: \n";
    for (key in this.registers) {
        temp += key + ": " + this.registers[key].toString() + "\n";
    }
    return temp;
}

// Forward the simulator to the next clock.
Controller.prototype.forward = function () {
    let key;
    // console.log(this.toString());  // debug info is here
    this.clock++;
    this.fetchInstruction();
    const issue = [];
    // Forward all function unit.
    for (key in this.functionUnitSet) {
        this.functionUnitSet[key].forwardPipeline(this.registers, this.clock);
    }
    // Update function unit information.
    for (key in this.functionUnitSet) {
        this.functionUnitSet[key].updateInfo(this.registers);
    }
    // Attempt to issue an instruction.
    for (let i = 0; i < this.fetched.length; i++) {
        const element = this.fetched[i];
        // attempt issue the not running instructions.
        if (!element.isRunning()) {
            const unitnames = this.opToFunctionUnit[element.Op];
            // check whether the correspond function unit.
            for (i = 0; i < unitnames.length; i++) {
                const unit = this.functionUnitSet[unitnames[i]];
                if (unit.loadInstruction(element, this.registers, this.clock)) {
                    issue.push(unit);
                    break;
                }
            }
            break;
        }
    }
    if (this.clock === 0) {
        return true;
    }
    // console.log(`clock: ${this.clock}, fetched: ${this.fetched}`)
    // Judge whether all the instructions are finished.
    const count = this.fetched.filter(function (element) {
        return !element.isFinished();
    }).length;
    return count !== 0;
}
