


"**protask**" is a library to manage tasks.

You can abort a task, or access "task local" (like thread local in Java) like below

**Not well tested, use at your own risk.**


### Usage


``` typescript
import { Task } from 'protask';


function sleep<T>(milliSeconds: number, arg?: T): Promise<T> {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, milliSeconds, arg);
    });
}

function *printTaskLocal() {
    yield* Task.yieldWrap(sleep(100));
    console.info(Task.locals());
}

async function childtask(){
    try{
        console.info('childtask local:',Task.locals());
        Task.locals()!.childtask='childtask';
        while(true){
            //Avoid to use it if possible. See comment.
            await Task.awaitWrap(sleep(1000));
        }
    }catch(e){
        //aborted
        console.info('childtask aborted',e);
    }
}

let task1=Task.fork(function *(){
    try {
        Task.locals()!.taskName='task 1';
        Task.fork(function*(){return yield* Task.yieldWrap(childtask())}).run();
        yield* printTaskLocal();
        for (let i = 0; i < 100; i++) {
            Task.locals()!.count = i;
            console.log('task 1 running');
            yield* printTaskLocal();
            yield* Task.yieldWrap(sleep(1000));
        }
        console.log('Task 1 resolve');
    } catch (e: any) {
        console.log('Task 1 error');
        console.info(e.toString());
    } finally {
        console.log('Task 1 finally');
    }
}).run();

let task2=Task.fork(function*(){
    yield* Task.yieldWrap(sleep(3000));
    console.info('abort task 1');
    task1.abort();
}).run();


```


"yieldWrap" is used to make typescript identifying the return value of a Promise. 
"awaitWrap" is used to keep Task context in async/await function.But it still may leak Task context to next microTask in loop, like 1.x. Use it carefully. Maybe you'd better to avoid to use it. 

### NPM Install 

```sh
npm i protask
```

### Note
protask 1.x hook the Promise to implement Task inheritation.But it work incorrectly in many case.

So 2.x use generator and custom scheduler instead. But it's not compatible with native async/await mechanism. Maybe a source convert like babel should also provide.


