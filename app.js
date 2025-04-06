let callback = function () {
    // initialize bootstrap tooltip
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
    const toastElList = document.querySelectorAll('.toast')
    const toastList = [...toastElList].map(toastEl => new bootstrap.Toast(toastEl, {
        delay: 6000
    }))
    let has_finished = false

    // timeout between two instructions
    const TimeoutVal = 2000;
    // Pre-instructions
    let source = ["LD F6 34 R2", "LD F2 45 R3", "MULT F0 F2 F4",
        "SUBD F8 F6 F2", "DIVD F10 F0 F6", "ADDD F6 F8 F2"]

    document.getElementById("new_instructions")
        .setAttribute("placeholder", source.join("\n"))

    // New simulator controller
    let controller = new Controller([]);
    let timeID = 0;

    document.getElementById("continue").onclick = function () {
        console.debug("clicked continue button")
        setUIandButtonState("pause", true)
        setUIandButtonState("continue", false)
        window.clearTimeout(timeID)
        timeID = window.setTimeout(uiRunSimulate, TimeoutVal)
    }

    document.getElementById("pause").onclick = function () {
        console.debug("clicked pause button")
        setUIandButtonState("pause", false)
        setUIandButtonState("continue", true)
        window.clearTimeout(timeID)
    };

    document.getElementById("reset").onclick = function () {
        console.debug("clicked reset button")
        document.getElementById("clockNum").innerText = "--"
        setUIandButtonState("continue", false)
        setUIandButtonState("pause", false)
        setUIandButtonState("reset", false)
        setUIandButtonState("load", true)
        document.getElementById("new_instructions").removeAttribute("readonly")
        const ul_elem = document.getElementById("unloaded_instruction_placeholder")
        if (ul_elem) ul_elem.classList.remove("invisible")

        // clear instruction status(UI)
        const unloaded_instruction_div = document.createElement("div")
        //         <div class="row" style="height: 15em; overflow: auto;" id="all_instructions">
        //             <div id="unloaded_instruction_placeholder">
        //                 <p class="text-center align-middle text-secondary">请点击Load按钮加载指令，这里才会显示内容</p>
        //             </div>
        //         </div>
        unloaded_instruction_div.setAttribute("id", "unloaded_instruction_placeholder")
        const p = document.createElement("p")
        p.textContent = "请点击Load按钮加载指令，这里才会显示内容"
        p.setAttribute("class", "text-center align-middle text-secondary")
        unloaded_instruction_div.appendChild(p)
        const ul = document.querySelectorAll("#all_instructions > ul")[0]
        if (ul){
            document.getElementById("all_instructions").removeChild(ul)
        }
        document.getElementById("all_instructions").appendChild(unloaded_instruction_div)
        document.getElementById("new_instructions").setAttribute("placeholder", source.join("\n"))
        // <tr id="instruction_status_table_placeholder">
        //                 <td colspan="11" class="table-secondary text-center align-middle"
        //                     style="height: 10em">
        //                     <p style="font-size: 1.5em">请点击Load按钮加载指令，这里才会显示内容</p>
        //                 </td>
        //             </tr>
        const p2 = document.createElement("p")
        p2.textContent = p.textContent
        p2.setAttribute("style", "font-size:1.5em")
        const td = document.createElement("td")
        td.setAttribute("colspan", "11")
        td.setAttribute("class", "table-secondary text-center align-middle")
        td.setAttribute("style", "height: 10em")
        td.appendChild(p2)
        const tr = document.createElement("tr")
        tr.setAttribute("id", "instruction_status_table_placeholder")
        tr.appendChild(td)
        document.querySelectorAll("#instruction_table>tr").forEach((ele) => {
            ele.remove()
        })
        document.getElementById("instruction_table").appendChild(tr)

        clearController()

        uiUpdateInstructions(controller);

        uiUpdateFunctionUnit(controller);

        uiUpdateRegister(controller);

        window.clearTimeout(timeID)
    }

    document.getElementById("load").onclick = function () {
        uiRunSimulate()

        setUIandButtonState("load", false)
        document.getElementById("new_instructions").setAttribute("readonly", 'true')
        setUIandButtonState("continue", false)
        setUIandButtonState("pause", true)
        setUIandButtonState("reset", true)

        // remove placeholders
        const pl_elem = document.getElementById("instruction_status_table_placeholder")
        if (pl_elem) pl_elem.remove()
        const ut_pl = document.getElementById("functional_unit_table_placeholder")
        if (ut_pl) ut_pl.remove()
        const ul_elem = document.getElementById("unloaded_instruction_placeholder")
        if (ul_elem) ul_elem.classList.add("invisible")
        // Load the new instructions
        const ins_input = document.getElementById("new_instructions").textContent
        document.getElementById("new_instructions").setAttribute("placeholder", "")
        let new_instructions
        if (ins_input.trim().length === 0) {
            // load default source(displayed in placeholder)
            new_instructions = source
        } else {
            // load input
            new_instructions = ins_input.trim().split("\n")
        }
        // clear previous controller
        clearController()

        try {
            new_instructions.forEach(function (instruction) {
                if (instruction === "") {
                    return;
                }
                const elements = instruction.split(" ");
                if (elements.length !== 4) {
                    throw new Error(`Bad instruction ${instruction}, length should be 4`);
                }
                if (controller.isInInstructionSet(elements[0])) {
                    controller.addInstruction(new Instruction(elements[0],
                        elements[1], elements[2], elements[3]));
                } else {
                    throw new Error(`element ${instruction} not in instruction set`);
                }
            });
            document.querySelectorAll("#instruction_table>tr").forEach((ele) => {
                ele.remove()
            })
            const all_instructions = controller.getNotExecInstruction().map(
                function (obj) {
                    return '<li class="list-group-item list-group-item-action instruction-item">' + obj.getSource() + "</li>";
                }
            );
            const str = all_instructions.join("");
            document.getElementById("all_instructions").innerHTML = `<ul class="list-group list-group-flush w-100">${str}</ul>`
            window.clearTimeout(timeID);
            timeID = window.setTimeout(uiRunSimulate, TimeoutVal);
        } catch (e) {
            console.error(`error instruction: ${e}`);
        }
    }


    // Forward the simulator and update the UI
    function uiRunSimulate() {
        const res = controller.forward()
        if (res) {
            timeID = window.setTimeout(uiRunSimulate, TimeoutVal);
        } else {
            // console.log("last run of uiRunSimulate()")
            if(has_finished){
                toastList.forEach(toast => toast.show())
                console.debug("本轮演示完毕！")
            }
            has_finished = true
            setUIandButtonState("load", true)
            setUIandButtonState("continue", false)
            setUIandButtonState("pause", false)
            setUIandButtonState("reset", false)
            const ul_elem = document.getElementById("unloaded_instruction_placeholder")
            if (ul_elem) ul_elem.classList.remove("invisible")
            document.getElementById("new_instructions").removeAttribute("readonly")
            document.getElementById("new_instructions").setAttribute("placeholder", source.join("\n"))
        }
        document.getElementById("clockNum").innerText = controller.clock
        uiUpdateInstructions(controller);

        uiUpdateFunctionUnit(controller);

        uiUpdateRegister(controller);

        const all_instructions = controller.getNotExecInstruction().map(
            function (obj) {
                return '<li class="list-group-item list-group-item-action instruction-item">' + obj.getSource() + "</li>";
            }
        );
        const str = all_instructions.join("");
        document.getElementById("all_instructions").innerHTML = `<ul class="list-group list-group-flush w-100">${str}</ul>`
    }

    // Update the function unit UI
    function uiUpdateFunctionUnit(simulator) {
        for (const key in simulator.functionUnitSet) {
            const unit = simulator.functionUnitSet[key];
            // console.log(unit)
            const row = document.getElementById(key);
            if (row === null) {
                // console.log("make unit row")
                const el = document.getElementById("function_unit")
                el.appendChild(uiMakeUnitRow(unit))
            } else {
                uiSetUnitStage(row, unit.exec);
                for (const element in unit) {
                    const temp = row.getElementsByClassName(element);
                    // console.log(temp)
                    if (temp.length !== 0) {
                        temp[0].textContent = unit[element]
                    }
                }
                const temp2 = row.getElementsByClassName("time")
                switch (unit.exec) {
                    case 2: // ID2 stage
                        if (temp2.length !== 0) {
                            // console.log(unit)
                            const restTime = unit.execTime - (simulator.clock - unit.execStart)
                            temp2[0].textContent = restTime >= 0 ? restTime.toString() : "发生RAW相关，指令暂停"
                        }
                        break;
                    case 3: // EX stage
                        if (temp2.length !== 0) {
                            // console.log(unit)
                            const restTime = unit.execTime - (simulator.clock - unit.execStart)
                            temp2[0].textContent = restTime >= 0 ? restTime.toString() : "发生WAR相关，指令暂停"
                        }
                        break;
                    case 4:  // WB stage
                        if (temp2.length !== 0) {
                            temp2[0].textContent = "执行完毕"
                        }
                        break;
                    default:
                        temp2[0].textContent = ''
                        break;
                }
            }
        }
    }

    function uiMakeUnitRow(unit) {
        let tr = document.createElement("tr")
        tr.setAttribute("id", unit.name)
        let time = document.createElement("td")
        time.setAttribute("class", "time")
        tr.appendChild(time)
        for (let attr of ["name", "busy", "Op", "Fi", "Fj", "Fk", "Qj", "Qk", "Rj", "Rk"]) {
            const el = document.createElement("td")
            el.setAttribute("class", attr)
            el.textContent = unit[attr]
            tr.appendChild(el)
        }
        return tr;
    }

    function uiSetUnitStage(row, exec) {
        switch (exec) {
            case 0: // stage none
                row.classList.remove("table-success", "table-info", "table-warning", "table-danger")
                break;
            case 1: // stage ID1(Issue)
                row.classList.add("table-info");
                row.classList.remove("table-danger", "table-warning", "table-success");
                break;
            case 2: // stage ID2(Read Operand)
                row.classList.add("table-warning");
                row.classList.remove("table-success", "table-danger", "table-info");
                break;
            case 3: // stage EX
                row.classList.add("table-danger");
                row.classList.remove("table-info", "table-success", "table-warning");
                break;
            case 4: // stage WB
                row.classList.add("table-success");
                row.classList.remove("table-info", "table-warning", "table-danger");
                break;
        }
    }

    // Update the register UI
    function uiUpdateRegister(simulator) {
        for (const key in simulator.registers) {
            const row = document.getElementById(key);
            if (row.innerText !== simulator.registers[key].manipulation) {
                row.innerText = simulator.registers[key].manipulation;
            }
        }
    }

    // Update the Instructions UI
    function uiUpdateInstructions(simulator) {
        let j;
        const rows = document.querySelectorAll("#instruction_table>tr")
        for (let i = 0; i < simulator.fetched.length; i++) {
            const instruction = simulator.fetched[i];
            if (i >= rows.length) {
                let temp_tr = document.createElement("tr")
                let src = document.createElement("td")
                src.textContent = instruction.getSource()
                temp_tr.appendChild(src)
                for (j = 0; j < instruction.stage.length; j++) {
                    const td = document.createElement("td")
                    td.textContent = instruction.stage[j]
                    temp_tr.appendChild(td)
                }
                document.getElementById("instruction_table").appendChild(temp_tr)
            } else {
                const cols = rows[i].querySelectorAll("td")
                cols[0].textContent = instruction.getSource()
                for (j = 0; j < instruction.stage.length; j++) {
                    cols[j + 1].innerText = instruction.stage[j]
                }
            }
        }
    }

    function setUIandButtonState(buttonID, isEnabled) {
        if (document.getElementById(buttonID) === null) {
            return
        }
        if (isEnabled) {
            document.getElementById(buttonID).classList.remove("disabled")
            document.getElementById(buttonID).removeAttribute("disabled")
        } else {
            document.getElementById(buttonID).classList.add("disabled")
            document.getElementById(buttonID).setAttribute("disabled", "disabled")
        }
    }

    function clearController(){
        // clear registers status(UI)
        for (let i = 0; i < 32; i++) {
            document.getElementById(`F${i}`).textContent = ''
            document.getElementById(`R${i}`).textContent = ''
        }

        // clear functional unit(UI)

        for (let className of ["Op", "Fi", "Fj", "Fk", "Qj", "Qk", "Rj", "Rk"]) {
            for (let elem of document.getElementsByClassName(className)) {
                elem.textContent = ''
            }
        }
        for (let name of ["Integer", "Mult1", "Mult2", "Add1", "Add2", "Divide"]) {
            let c = document.getElementById(name).classList
            if (c) {
                c.length = 0
            }
        }

        // clear inner registers data(UI)
        for (let key in Object.keys(controller.registers)) {
            controller.registers[key] && controller.registers[key].clear()
        }

        // clear inner controller data

        controller = new Controller([])
        has_finished = false
    }
};

if (
    document.readyState === "complete" ||
    (document.readyState !== "loading" && !document.documentElement.doScroll)
) {
    callback();
} else {
    document.addEventListener("DOMContentLoaded", callback);
}
