import { Component, createEffect, createSignal, For, onMount, Show, Signal } from 'solid-js';

const App: Component = () => {

  //Refs used for storing values
  let textInputRef!: HTMLInputElement;

  //Signal used for handling state changes
  const [error, setError]: Signal<string[]> = createSignal([]);
  const [cmds, setCmds]: Signal<string[]> = createSignal([]);
  const [currImage, setCurrImage]: Signal<File | undefined> = createSignal();
  const [base64Image, setBase64Image]: Signal<string> = createSignal('');

  //Listen for changes made to input values

  //URL.createObjectURL(data.target.files[0])
  function imageChangeListener(data: HTMLInputElement): boolean {
    if (data?.files?.length) {
      setCurrImage(data.files[0]);
      return true;
    }
    return false;
  }

  //Actions to take when button clicked for submit

  function submitButtonClick(): boolean {
    if(textInputRef.value){
      //setCmds([...cmds(), textInputRef.value]);
      //lastCmd = textInputRef.value;
      makePostRequest('cmd', textInputRef.value);
      textInputRef.value = "";
      return true;
    }
    return false;
  }

  function undoButtonClick(): boolean {
    return makePostRequest('undo');
  }

  function revertButtonClick(index: number): boolean {
    if(index < 0 || index > cmds().length){
      return false
    }
    //Make POST request to do this. setCmds(cmds().slice(0,index));
    //revertIndex = index;
    return makePostRequest('revert', index.toString());
  }

  // Misc functions

  //Requests made for new img, new cmd, update, revert
  function makePostRequest(req: string, arg = ""): boolean {
    const bodyData:FormData = new FormData();
    let updateCmds = false;

    switch(req){
      case('image'):
        if(!currImage()){
          console.error("No image to upload!");
          break;
        }
        bodyData.append('file', currImage() as File);
        break;
      case('cmd'): 
        !!arg && bodyData.append('cmd', arg);
        updateCmds = true;
        break;
      case('undo'): 
        bodyData.append('undo', 'undo');
        updateCmds = true;
        break;
      case('revert'):
        !!arg && bodyData.append('revert', arg);  
        updateCmds = true;
        break;
      default:
        console.log("Nothing here, do something later!");
    }

    if(!bodyData){
      return false;
    }
    const requestOptions = {
      method: 'POST',
      body: bodyData,
    };
    
    fetch('http://localhost:5000/api/post', requestOptions)
      .then(response => {console.log(response); return response.json()})
        .then(data => {
          setBase64Image(`data:image/png;base64,${data.image}`);
          updateCmds && setCmds(data.commands ? data.commands : []);
          data.errors && setError(data.errors.filter((i: unknown) => i));
        })
        .catch(() => console.error("JSONification failed!"));

    return true;
  }

  function uploadNewFile(): void {
    if(!currImage()){
      console.warn("Nothing to upload!");
      return;
    }
    makePostRequest('image');
  }

  function getSortedIndex(index: number): number {
    if(cmds().length){
      return cmds().length - index -1;
    }
    return -1;
  }

  //Hooks (mostly for handling api calls!!!);
  onMount(() => {
    fetch("http://localhost:5000/api/get").then((res) => res.json())
      .then((json) => {
          //Returns a b64 encoding of a PNG image!
          setBase64Image(`data:image/png;base64,${json.image}`);
          setCmds(json.commands);
      }).catch(() => console.error("Unable to fetch image data!"));
  });

  createEffect(() => {
    function convertImageToBase64(data: File | undefined): Promise<string> {
      //Alternative to b64 would be:
      //URL.createObjectURL(data) -> returns data as blob://
      if (data) {
        const filePromse = new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(data);
          reader.onerror = (e) => reject(e);
          reader.onabort = (e) => reject(e);
          reader.onloadend = () => {
            if(reader.result){
              resolve(reader.result as string);
            }
          }
        });
        return filePromse;
      } else {
        return Promise.reject("No image found!");
      }
    }
    convertImageToBase64(currImage()).then((b64img) => {
      setBase64Image(b64img);
    }).catch((err) => console.error(err));
  });
 
  return (
    <>
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container-fluid">
        <a class="navbar-brand" href="#" style={{float: 'left', "margin-left": "3%"}}>ImageText: Transform Images Using Sentences</a>
      </div>
    </nav>

    <div id ="body">
      <div id="image">
        <div id="imgSrc">
          <Show when={base64Image()}>
              <img src={base64Image()} />
          </Show>
        </div>

        <div id ="upload" class="form-group">
          <label for="formFile" class="form-label mt-4">Upload a new Image</label>
          <div>
            <input 
              onChange={(e)=>imageChangeListener(e.target as HTMLInputElement)} 
              name="file" 
              class="form-control" 
              type="file" 
              id="formFile" 
              style={{width: "80%", float: "left"}} 
            />
            <button 
              onClick={() => uploadNewFile()}
              class="btn btn-outline-primary" 
              type="submit" 
              style={{float: "right", width: "15%", clear: "none"}}>
                Upload
            </button>
          </div>
          <div style={{"margin-bottom": "15px"}}>{' '}{' '}</div>
          <Show when={error().length > 0}>
            <div class="alert alert-dismissible alert-danger">
              <button type="button" class="btn-close" data-bs-dismiss="alert" />
              <strong>Error!</strong> {error()[0]}.
            </div>
          </Show>
        </div>

      </div>

      <div id="commandline" class="form-group">
        <Show when={error().length == 2}>
        <div class="alert alert-dismissible alert-danger">
          <button type="button" class="btn-close" data-bs-dismiss="alert" />
          <strong>Error!</strong> {error()[1]}
        </div>
        </Show>
        <div>
          <input 
            onKeyDown={(e) => e.key === 'Enter' && submitButtonClick()}
            ref={textInputRef}
            name="cmd" 
            type="text" 
            class="form-control" 
            placeholder="Enter a command" 
            id="inputDefault" 
            style={{"margin-bottom": "12px"}} 
          />
          <button onClick={()=>submitButtonClick()} type="submit" class="btn btn-outline-primary" style={{float: "right"}}>Transform</button>
          <button onClick={()=>undoButtonClick()} name="undo" value="undo" type="submit" class="btn btn-outline-danger" style={{float: "right", "margin-right": "15px"}}>Undo</button>
        </div>
        <table class="table table-hover">
          <thead>
            <tr>
              <th scope="col"> Command History: </th>
            </tr>
          </thead>
          <tbody>
            <For each={cmds().slice().reverse()}>
              {(cmd, index) => 
              <tr class="table-primary">
                <td style={{"vertical-align": "middle", "font-size": "110%"}}>
                  {`${getSortedIndex(index())}.) ${cmd} `} 
                  <button
                    name="revert" 
                    onClick={() => revertButtonClick(getSortedIndex(index()))}
                    value={index().toString()} 
                    class="btn btn-light btn-sm" 
                    style={{float: "right"}}>
                      Revert
                  </button>
                </td>
              </tr>
              }
            </For>
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
};

export default App;
