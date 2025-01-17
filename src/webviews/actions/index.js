const vscode = require(`vscode`);

const {CustomUI, Field} = require(`../../api/CustomUI`);

const Configuration = require(`../../api/Configuration`);

module.exports = class SettingsUI {

  /**
   * Called to log in to an IBM i
   * @param {vscode.ExtensionContext} context
   */
  static init(context) {
    context.subscriptions.push(
      vscode.commands.registerCommand(`code-for-ibmi.showActionsMaintenance`, async () => {
        this.MainMenu();
      })
    )
  }

  static async MainMenu() {
    let allActions = Configuration.get(`actions`);

    let ui = new CustomUI();
    let field;
    

    field = new Field(`tree`, `actions`, `Work with Actions`);
    field.description = `Create or maintain Actions.`;
    field.items = [
      {
        label: `New Action`,
        value: `-1`
      },
      {
        label: `Duplicate Action`,
        value: `-2`
      },
      {
        label: `-`,
        value: `-2`
      },
      ...allActions.map((action, index) => ({
        label: `${action.name} (${action.type}: ${action.extensions.join(`, `)})`,
        value: String(index)
      })).sort((a, b) => a.label.localeCompare(b.label))
    ];
    
    ui.addField(field);

    let {panel, data} = await ui.loadPage(`Work with Actions`);

    if (data) {
      panel.dispose();

      if (data.actions) {
        switch (data.actions) {
        case `-1`: //New
          this.WorkAction(-1);
          break;
        case `-2`: //Duplicate
          this.DuplicateAction();
          break;
        default:
          this.WorkAction(Number(data.actions));
          break;
        }
      }
    }
  }

  /**
   * Show item picker to duplicate an existing action
   */
  static async DuplicateAction() {
    let actions = Configuration.get(`actions`);
  
    vscode.window.showQuickPick(
      actions.map((action, index) => ({
        label: `${action.name} (${action.type}: ${action.extensions.join(`, `)})`,
        value: index
      })).sort((a, b) => a.label.localeCompare(b.label)),
      {
        placeHolder: `Select an action to duplicate`
      }
    ).then(async (action) => {
      if (action) {
        //@ts-ignore
        const index = action.value;

        const newAction = {...actions[index]};
        actions.push(newAction);
        await Configuration.setGlobal(`actions`, actions);
        this.WorkAction(actions.length - 1);
      } else {
        this.MainMenu();
      }
  
    });
  }

  /**
   * Edit an existing action
   * @param {number} id Existing action index, or -1 for a brand new index
   */
  static async WorkAction(id) {
    let allActions = Configuration.get(`actions`);
    let currentAction;
    
    if (id >= 0) {
      //Fetch existing action

      currentAction = allActions[id];

    } else {
      //Otherwise.. prefill with defaults
      currentAction = {
        type: `member`,
        extensions: [
          `RPGLE`,
          `RPG`
        ],
        environment: `ile`,
        name: ``,
        command: ``
      }
    }

    if (currentAction.environment === undefined) currentAction.environment = `ile`;

    let ui = new CustomUI();

    ui.addField(new Field(`input`, `name`, `Action name`));
    ui.fields[0].default = currentAction.name;

    ui.addField(new Field(`input`, `command`, `Command to run`));
    ui.fields[1].default = currentAction.command;

    ui.addField(new Field(`input`, `extensions`, `Extensions`));
    ui.fields[2].default = currentAction.extensions.join(`, `);
    ui.fields[2].description = `A comma delimited list of extensions for this actions.`;

    ui.addField(new Field(`select`, `type`, `Types`));
    ui.fields[3].description = `The types of files this action can support.`;
    ui.fields[3].items = [
      {
        selected: currentAction.type === `member`,
        value: `member`,
        description: `Member`,
        text: `Source members in the QSYS file system`,
      },
      {
        selected: currentAction.type === `streamfile`,
        value: `streamfile`,
        description: `Streamfile`,
        text: `Streamfiles in the IFS`,
      },
      {
        selected: currentAction.type === `object`,
        value: `object`,
        description: `Object`,
        text: `Objects in the QSYS file system`,
      }
    ];

    ui.addField(new Field(`select`, `environment`, `Environment`));
    ui.fields[4].description = `Environment for command to be executed in.`;
    ui.fields[4].items = [
      {
        selected: currentAction.environment === `ile`,
        value: `ile`,
        description: `ILE`,
        text: `Runs as an ILE command`,
      },
      {
        selected: currentAction.environment === `qsh`,
        value: `qsh`,
        description: `QShell`,
        text: `Runs the command through QShell`,
      },
      {
        selected: currentAction.environment === `pase`,
        value: `pase`,
        description: `PASE`,
        text: `Runs the command in the PASE environment`,
      }
    ];

    ui.addField(new Field(`submit`, `submitButton`, `Save`));

    let {panel, data} = await ui.loadPage(`Work with Actions`);

    if (data) {
      panel.dispose();
      
      const newAction = {
        type: data.type,
        extensions: data.extensions.split(`,`).map(item => item.trim().toUpperCase()),
        environment: data.environment,
        name: data.name,
        command: data.command
      };

      if (id >= 0) {
        allActions[id] = newAction;
      } else {
        allActions.push(newAction);
      }

      await Configuration.setGlobal(`actions`, allActions);
    }

    this.MainMenu();
  }

}