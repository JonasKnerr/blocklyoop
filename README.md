Dies ist eine innerhalb meiner Bachelorarbeit implementierte objektorientierte Erweiterung für Blockly. Blockly gitHub: https://github.com/google/blockly.

In der index.html im Ordner blockly, sind die grundlegenden Funktionen von Blockly sowie die hinzugefügten Klassenblöcke eingebunden,

Zum Benutzen muss zu erst ein Klassenblöcke erstellt werden. Dieser kann über den Mutator um beliebig viele Attribute erweitert werden. Methoden befinden sich unter der Rubrik "Klasse", diese können in belibiger Anzahl zur Klasse hinzugefügt werden.

Für jede erstellte Klasse entsteht in der Toolbox einer "new" Block. Und unter "variablen" ein neuer "create Klasse variable..." Button. Über den Button kann eine neues Objekt der Klasse erstellt werden, dieses muss durch den "new" Block der Klasse zugewiesen werden. Dann können am Variablenblock die verschiedenen Methoden und Attribute der Klasse aufgerufen werden.

Durch den "Run" Button kann der erstellte Blockly-Code in JavaScript-Code umgewandelt und ausgeführt werden. Nachdem Ausführen erscheint der erstellten JavaScript-Code rechts neben dem Workspace.
