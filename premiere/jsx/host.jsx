// Kisa Kes - Premiere Pro ExtendScript tarafi (ES3: JSON yok; dosya ASCII kalmali)

function kisaKes_quote(s) {
  return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

// Once timeline'daki secili klibe, yoksa Proje panelindeki secime bakar
function kisaKes_getSelectedMedia() {
  var item = null;
  var seq = app.project.activeSequence;
  if (seq) {
    var selection = seq.getSelection();
    for (var i = 0; i < selection.length && !item; i++) {
      if (selection[i].projectItem) item = selection[i].projectItem;
    }
  }
  if (!item) {
    var viewIDs = app.getProjectViewIDs();
    if (viewIDs && viewIDs.length) {
      var projectSelection = app.getProjectViewSelection(viewIDs[0]);
      if (projectSelection && projectSelection.length) item = projectSelection[0];
    }
  }
  if (!item) return '{"error":"NO_SELECTION"}';

  var mediaPath = item.getMediaPath ? item.getMediaPath() : '';
  if (!mediaPath) return '{"error":"NO_MEDIA"}';
  return '{"path":' + kisaKes_quote(mediaPath) + '}';
}

function kisaKes_importXml(xmlPath) {
  var sequences = app.project.sequences;
  var before = sequences.numSequences;
  app.project.importFiles([xmlPath], true, app.project.getInsertionBin(), false);
  sequences = app.project.sequences; // import sonrasi guncel liste
  if (sequences.numSequences <= before) return 'IMPORT_FAILED';
  // shortcut: yeni sekansin listenin sonunda oldugu varsayilir; yanlis sekans acilirsa ada gore arayin
  app.project.openSequence(sequences[sequences.numSequences - 1].sequenceID);
  return 'OK';
}
