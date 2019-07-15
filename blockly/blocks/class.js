goog.provide("Blockly.Constants.Class");

goog.require("Blockly.Blocks");
goog.require("Blockly");

//@Jonas Knerr
Blockly.Blocks["class_get_instance"] = {
  init: function() {
    this.appendDummyInput()
      .appendField("new")
      .appendField(this.id, "NAME");
    this.args = 0;
    this.argNames = [];
    this.setOutput(true, this.getFieldValue("NAME"));
    this.setTooltip("");
    this.setHelpUrl("");
    this.initColour();
  },
  initColour: function() {
    let className = this.inputList[0].fieldRow[1].text_;
    var classBlock = Blockly.Class.getClassByName(Blockly.getMainWorkspace(), className);
    if (classBlock) {
      this.setColour(classBlock.getColour());
    }
  },
  changeOutput: function(newName) {
    this.setOutput(true, newName);
  },
  getClassName: function() {
    return this.getFieldValue("NAME");
  },

  getInstanceDef: function() {
    return [this.getClassName(), this.getFieldValue("INSTANCE")];
  },
  getConstructor: function() {
    return this.constr;
  },
  onchange: function() {
    if (!this.getInputsInline()) {
    }
    this.changeOutput(this.getFieldValue("NAME"));
  },
  /*
   * Upates constructor attributes if control_class gets changed
   */
  update: function() {
    var constr = Blockly.Class.getConstructor(this.workspace, this.getClassName());
    this.constr = constr;
    if (constr) {
      var args = constr.getVars();
      if (this.args != args.length) {
        if (this.args > args.length) {
          while (this.args > args.length) {
            this.args--;
            this.removeInput("ARG" + this.args);
          }
        } else {
          this.appendValueInput("ARG" + this.args).appendField(args[this.args]);
          this.args++;
        }
      }
      var count = Blockly.Class.arraysEqual(this.argNames, args);
      if (typeof count == "number") {
        this.removeInput("ARG" + count);
        this.appendValueInput("ARG" + count).appendField(args[count]);
        var countInc = count + 1;
        if (this.getInput("ARG" + countInc)) this.moveInputBefore("ARG" + count, "ARG" + countInc);
      }
      this.argNames = args;
    }
  },
  /**
   * renames the class, checks the oldName to only rename
   * classes with the same name
   */
  renameClass: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getClassName())) {
      this.setFieldValue(newName, "NAME");
    }
  },
  mutationToDom: function() {
    var container = document.createElement("mutation");
    container.setAttribute("name", this.getClassName());
    return container;
  },
  domToMutation: function(xmlElement) {
    var name = xmlElement.getAttribute("name");
    this.renameClass(this.getClassName(), name);
    this.initColour();
  },
  defType_: "class"
};

/**
 * Class to create a new Class with instances
 * add atrributes with decompose and compose functions
 */

Blockly.Blocks["class_class"] = {
  init: function() {
    var nameField = new Blockly.FieldTextInput("", Blockly.Class.renameClass);
    nameField.setSpellcheck(false);
    this.appendDummyInput()
      .appendField("Klasse")
      .appendField(nameField, "NAME");
    this.appendDummyInput("METHODS").appendField("Methoden");
    // this.appendStatementInput("METHODS0").setCheck([
    //   "class_function_noreturn",
    //   "class_function_return"
    // ]);
    this.setColour(Blockly.Class.colour());
    this.setConstructor(true);
    this.setMutator(new Blockly.Mutator(["class_attribute"], this));
    this.attributeCount = 0;
    this.methods = [];
    this.attributeInputs = [];
    this.oldName = "";
    this.hasConstr = true;
    this.statementConnection_ = null;
    this.setTooltip("");
    this.setHelpUrl("");
  },
  onchange: function(event) {
    if (!this.isInFlyout) {
      var counter = 0;
      var removed;
      var orgBlocks = false;
      var methods = [];
      var isRemoved = false;

      while (this.getInput("METHODS" + counter)) {
        orgBlocks = true;
        if (!this.getInputTargetBlock("METHODS" + counter)) {
          this.removeInput("METHODS" + counter);
          if (!isRemoved) {
            removed = counter;
            isRemoved = true;
          }
        }
        if (this.getInputTargetBlock("METHODS" + counter)) {
          methods.push(this.getInputTargetBlock("METHODS" + counter));
        }
        counter++;
      }

      if (removed) {
        this.appendStatementInput("METHODS" + removed).setCheck([
          "class_function_noreturn",
          "class_function_return"
        ]);
      } else if (!this.getInput("METHODS0")) {
        this.appendStatementInput("METHODS0").setCheck([
          "class_function_noreturn",
          "class_function_return"
        ]);
      } else if (!this.getInput("METHODS" + counter)) {
        this.appendStatementInput("METHODS" + counter).setCheck([
          "class_function_noreturn",
          "class_function_return"
        ]);
      }
      this.methods = methods;
      Blockly.Class.mutateCallers(this);
      this.changeScope();
    }
  },
  changeScope: function() {
    var attributeCount = 0;
    var attributeInputs = [];
    while (attributeCount <= this.attributeCount) {
      attributeCount++;
      if (this.getInputTargetBlock("attribute" + attributeCount)) {
        var name = this.getInputTargetBlock("attribute" + attributeCount).inputList[0].fieldRow[0]
          .variable_.name;
        this.workspace.changeVariableScope(name, this.oldName, this.getClassDef());
        attributeInputs.push(name);
      }
    }
    // set variables to global that are not in the class anymore
    if (this.attributeInputs.length > attributeInputs.length) {
      var changedInput = this.attributeInputs.filter(x => !attributeInputs.includes(x));
      this.workspace.changeVariableScope(changedInput[0], this.oldName, "global");
    }
    this.attributeInputs = attributeInputs;
  },
  setOldName(oldName) {
    this.oldName = oldName;
  },
  decompose: function(workspace) {
    var topBlock = workspace.newBlock("class_mutator", false, this);
    topBlock.initSvg();

    //set field according to constructor
    topBlock.setFieldValue(this.hasConstr ? "TRUE" : "FALSE", "CONSTR");

    var connection = topBlock.getInput("STACK").connection;
    for (var j = 1; j <= this.attributeCount; j++) {
      var attributeBlock = workspace.newBlock("class_attribute", false, this);
      attributeBlock.initSvg();
      connection.connect(attributeBlock.previousConnection);
      connection = attributeBlock.nextConnection;
    }
    return topBlock;
  },
  compose: function(containerBlock) {
    var inputBlocks = [];
    for (var i = this.attributeCount; i > 0; i--) {
      inputBlocks.push(this.getInputTargetBlock("attribute" + i));
      this.removeInput("attribute" + i);
    }
    this.attributeCount = 0;
    var inputLength = inputBlocks.length;
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    while (itemBlock) {
      if (itemBlock.type == "class_attribute") {
        var inputBlock = inputBlocks[inputLength - 1];
        inputLength--;
        this.attributeCount++;
        var attributeInput = this.appendValueInput("attribute" + this.attributeCount)
          .setCheck(null)
          .appendField("Attribut");
        if (inputBlock) {
          attributeInput.connection.connect(inputBlock.outputConnection);
        }
        if (this.hasConstr) {
          this.moveInputBefore("attribute" + this.attributeCount, "CONSTRUCTOR");
        } else {
          this.moveInputBefore("attribute" + this.attributeCount, "METHODS");
        }
      }
      itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
    var hasConstr = containerBlock.getFieldValue("CONSTR");

    if (hasConstr !== null) {
      hasConstr = hasConstr == "TRUE";

      if (this.hasConstr != hasConstr) {
        if (hasConstr) {
          this.setConstructor(true);

          // Restore the stack, if one was saved.
          Blockly.Mutator.reconnect(this.statementConnection_, this, "CONSTRUCTOR");
          this.statementConnection_ = null;
        } else {
          //Save the stack, then disconnect it.
          var stackConnection = this.getInput("CONSTRUCTOR").connection;
          this.statementConnection_ = stackConnection.targetConnection;
          if (this.statementConnection_) {
            var stackBlock = stackConnection.targetBlock();
            stackBlock.unplug();
            stackBlock.bumpNeighbours_();
          }
          this.setConstructor(false);
          //this.removeInput("CONSTRUCTOR");
        }
        this.hasConstr = hasConstr;
      }
    }
  },
  setConstructor: function(hasCons) {
    if (hasCons) {
      this.appendStatementInput("CONSTRUCTOR")
        .appendField("Konstruktor")
        .setCheck(["class_constructor"]);
      this.moveInputBefore("CONSTRUCTOR", "METHODS");
    } else {
      this.removeInput("CONSTRUCTOR");
    }
  },
  mutationToDom: function() {
    if (!this.atrributeCount && !this.methods.length) {
      return null;
    }
    var container = document.createElement("mutation");
    if (this.attributeCount) {
      container.setAttribute("attribute", this.attributeCount);
    }
    return container;
  },
  domToMutation: function(xmlElement) {
    this.atrributeCount = parseInt(xmlElement.getAttribute("attribute"), 10) || 0;
    for (var i = 1; i < this.attributeCount; i++) {
      this.appendValueInput("attribute" + i)
        .setCheck(null)
        .appendField("Attribute");
    }
  },
  getAttributeInputs: function() {
    return this.attributeInputs;
  },
  getClassDef: function() {
    return this.getFieldValue("NAME");
  },
  getStatement: function() {
    return this.methods;
  },
  getConstructor: function() {
    return this.getInputTargetBlock("CONSTRUCTOR");
  },
  callType_: "class"
};

Blockly.Blocks["class_constructor"] = {
  init: function() {
    var nameField = new Blockly.FieldTextInput("", Blockly.Procedures.rename);
    nameField.setSpellcheck(false);
    this.appendDummyInput()
      .appendField("Konstruktor")
      .appendField("", "PARAMS");
    this.setMutator(new Blockly.Mutator(["procedures_mutatorarg"]));
    if (
      (this.workspace.options.comments ||
        (this.workspace.options.parentWorkspace &&
          this.workspace.options.parentWorkspace.options.comments)) &&
      Blockly.Msg["PROCEDURES_DEFNORETURN_COMMENT"]
    ) {
      this.setCommentText(Blockly.Msg["PROCEDURES_DEFNORETURN_COMMENT"]);
    }
    this.setNextStatement(true);
    this.setPreviousStatement(true);
    this.setColour(Blockly.Msg["PROCEDURES_HUE"]);
    this.setTooltip(Blockly.Msg["PROCEDURES_DEFNORETURN_TOOLTIP"]);
    this.setHelpUrl(Blockly.Msg["PROCEDURES_DEFNORETURN_HELPURL"]);
    this.arguments_ = [];
    this.argumentVarModels_ = [];
    this.setStatements_(true);
    this.statementConnection_ = null;
  },
  setStatements_: Blockly.Blocks["procedures_defnoreturn"].setStatements_,
  updateParams_: Blockly.Blocks["procedures_defnoreturn"].updateParams_,
  mutationToDom: Blockly.Blocks["procedures_defnoreturn"].mutationToDom,
  domToMutation: Blockly.Blocks["procedures_defnoreturn"].domToMutation,
  decompose: Blockly.Blocks["procedures_defnoreturn"].decompose,
  compose: Blockly.Blocks["procedures_defnoreturn"].compose,
  getVars: Blockly.Blocks["procedures_defnoreturn"].getVars,
  getConstructorDef: function() {
    return ["Constructor", this.arguments_, false];
  },
  getVarModels: Blockly.Blocks["procedures_defnoreturn"].getVarModels,
  renameVarById: Blockly.Blocks["procedures_defnoreturn"].renameVarById,
  updateVarName: Blockly.Blocks["procedures_defnoreturn"].updateVarName,
  displayRenamedVar_: Blockly.Blocks["procedures_defnoreturn"].displayRenamedVar_,
  customContextMenu: Blockly.Blocks["procedures_defnoreturn"].customContextMenu,
  callType_: "class_constructor"
};

Blockly.Blocks["class_function_return"] = {
  init: function() {
    var nameField = new Blockly.FieldTextInput("", Blockly.Class.renameMethod);
    nameField.setSpellcheck(false);
    this.setInput(nameField);
    this.appendValueInput("RETURN")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField(Blockly.Msg["PROCEDURES_DEFRETURN_RETURN"]);
    this.setMutator(new Blockly.Mutator(["procedures_mutatorarg"]));
    if (
      (this.workspace.options.comments ||
        (this.workspace.options.parentWorkspace &&
          this.workspace.options.parentWorkspace.options.comments)) &&
      Blockly.Msg["PROCEDURES_DEFRETURN_COMMENT"]
    ) {
      this.setCommentText(Blockly.Msg["PROCEDURES_DEFRETURN_COMMENT"]);
    }
    this.setNextStatement(false);
    this.setPreviousStatement(true, ["class_function_noreturn", "class_function_return"]);
    this.setColour(Blockly.Msg["PROCEDURES_HUE"]);
    this.setTooltip(Blockly.Msg["PROCEDURES_DEFRETURN_TOOLTIP"]);
    this.setHelpUrl(Blockly.Msg["PROCEDURES_DEFRETURN_HELPURL"]);
    this.arguments_ = [];
    this.argumentVarModels_ = [];
    this.setStatements_(true);
    this.statementConnection_ = null;
  },
  setInput: function(nameField) {
    if (this.isInFlyout) {
      this.appendDummyInput()
        .appendField("Methode")
        .appendField(nameField, "NAME")
        .appendField("", "PARAMS");
    } else {
      this.appendDummyInput()
        .appendField(nameField, "NAME")
        .appendField("", "PARAMS");
    }
  },
  setStatements_: Blockly.Blocks["procedures_defnoreturn"].setStatements_,
  updateParams_: Blockly.Blocks["procedures_defnoreturn"].updateParams_,
  mutationToDom: Blockly.Blocks["procedures_defnoreturn"].mutationToDom,
  domToMutation: Blockly.Blocks["procedures_defnoreturn"].domToMutation,
  decompose: Blockly.Blocks["procedures_defnoreturn"].decompose,
  compose: Blockly.Blocks["procedures_defnoreturn"].compose,
  getVars: Blockly.Blocks["procedures_defnoreturn"].getVars,
  getMethodDef: function() {
    return [this.getFieldValue("NAME"), this.arguments_, true];
  },
  getVarModels: Blockly.Blocks["procedures_defnoreturn"].getVarModels,
  renameVarById: Blockly.Blocks["procedures_defnoreturn"].renameVarById,
  updateVarName: Blockly.Blocks["procedures_defnoreturn"].updateVarName,
  displayRenamedVar_: Blockly.Blocks["procedures_defnoreturn"].displayRenamedVar_,
  customContextMenu: Blockly.Blocks["procedures_defnoreturn"].customContextMenu,
  callType_: "class_function_return"
};

Blockly.Blocks["class_function_noreturn"] = {
  init: function() {
    var nameField = new Blockly.FieldTextInput("", Blockly.Class.renameMethod);
    nameField.setSpellcheck(false);
    this.setInput(nameField);
    this.setMutator(new Blockly.Mutator(["procedures_mutatorarg"]));
    if (
      (this.workspace.options.comments ||
        (this.workspace.options.parentWorkspace &&
          this.workspace.options.parentWorkspace.options.comments)) &&
      Blockly.Msg["PROCEDURES_DEFNORETURN_COMMENT"]
    ) {
      this.setCommentText(Blockly.Msg["PROCEDURES_DEFNORETURN_COMMENT"]);
    }
    this.setNextStatement(false);
    this.setPreviousStatement(true, ["class_function_noreturn", "class_function_return"]);
    this.setColour(Blockly.Msg["PROCEDURES_HUE"]);
    this.setTooltip(Blockly.Msg["PROCEDURES_DEFNORETURN_TOOLTIP"]);
    this.setHelpUrl(Blockly.Msg["PROCEDURES_DEFNORETURN_HELPURL"]);
    this.arguments_ = [];
    this.argumentVarModels_ = [];
    this.setStatements_(true);
    this.statementConnection_ = null;
  },
  setInput: Blockly.Blocks["class_function_return"].setInput,
  setStatements_: Blockly.Blocks["procedures_defnoreturn"].setStatements_,
  updateParams_: Blockly.Blocks["procedures_defnoreturn"].updateParams_,
  mutationToDom: Blockly.Blocks["procedures_defnoreturn"].mutationToDom,
  domToMutation: Blockly.Blocks["procedures_defnoreturn"].domToMutation,
  decompose: Blockly.Blocks["procedures_defnoreturn"].decompose,
  compose: Blockly.Blocks["procedures_defnoreturn"].compose,
  getVars: Blockly.Blocks["procedures_defnoreturn"].getVars,
  getMethodDef: function() {
    return [this.getFieldValue("NAME"), this.arguments_, false];
  },
  getVarModels: Blockly.Blocks["procedures_defnoreturn"].getVarModels,
  renameVarById: Blockly.Blocks["procedures_defnoreturn"].renameVarById,
  updateVarName: Blockly.Blocks["procedures_defnoreturn"].updateVarName,
  displayRenamedVar_: Blockly.Blocks["procedures_defnoreturn"].displayRenamedVar_,
  customContextMenu: Blockly.Blocks["procedures_defnoreturn"].customContextMenu,
  callType_: "class_function_noreturn"
};
Blockly.Blocks["class_attribute"] = {
  init: function() {
    this.appendValueInput("NAME")
      .setCheck(null)
      .appendField("attribute");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.initColour();
    this.setTooltip("");
    this.setHelpUrl("");
    this.contextMenu = false;
  },
  initColour: function() {
    if (this.mutatorParentBlock) {
      var currentBlock = this.mutatorParentBlock;
      var className = currentBlock.getClassDef();
      var classBlock = Blockly.Class.getClassByName(currentBlock.workspace, className);
      this.setColour(classBlock.getColour());
    } else {
      this.setColour(20);
    }
  }
};
Blockly.Blocks["class_mutator"] = {
  init: function() {
    this.appendDummyInput().appendField("class");
    this.appendStatementInput("STACK");
    this.appendDummyInput("CONSTR_INPUT")
      .appendField("Konstruktor")
      .appendField(new Blockly.FieldCheckbox("FALSE"), "CONSTR");
    this.initColour();
    this.setTooltip("");
    this.setHelpUrl("");
    this.contextMenu = false;
  },
  initColour: function() {
    var currentBlock = this.mutatorParentBlock;
    var className = currentBlock.getClassDef();
    var classBlock = Blockly.Class.getClassByName(currentBlock.workspace, className);
    this.setColour(classBlock.getColour());
  }
};
