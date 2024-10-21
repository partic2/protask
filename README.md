


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

let task1=new Task(function *(){
    try {
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
},'test task 1',).run();

let task2=new Task(function*(){
    yield* Task.yieldWrap(sleep(3000));
    console.info('abort task 1');
    task1.abort();
}).run();

```

### NPM Install 

```sh
npm i protask
```

### Note
protask 1.x hook the Promise to implement Task inheritation.But it work incorrectly in many case.

So 2.x use generator and custom scheduler instead. But it's not compatible with native async/await mechanism. Maybe a source convert like babel should also provide.