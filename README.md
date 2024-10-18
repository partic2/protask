


"**protask**" is a task library to provide task manager.

By hook the Promise method, You can "abort" a task or asynchronous function without manual "throwIfAborted".
Also this library provide task local variable support.

Note: "Promise" Created in asynchronous function will inherit the current task, But not necessarily for "Promise" created in callback.

**Not well tested, use at your own risk.**


### NPM Install 

```sh
npm i protask
```

### Usage

``` typescript

import {task} from 'protask'

function sleep<T>(milliSeconds: number, arg?: T): Promise<T> {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, milliSeconds, arg)
    });
}

async function printTaskLocal(){
    await sleep(100);
    console.info(task.locals());
}

task.create('test task 1',async ()=>{
    try{
        for(let i=0;i<100;i++){
            task.locals()!.count=i;
            await printTaskLocal();
            await sleep(1000)
        }
    }catch(e:any){
        console.info(e.toString());
    }
});

task.create('test task 2',(async ()=>{
    await sleep(3000);
    console.info('abort task 1')
    task.abort('test task 1');
}));

```