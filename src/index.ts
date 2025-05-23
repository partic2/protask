

//AbortController polyfill on https://github.com/mo/abortcontroller-polyfill
(function(){
    class AbortSignal extends EventTarget {
        aborted: boolean = false;
        reason?: any;
        onabort?: (ev: Event) => void
        constructor() {
            super();
        }
        toString() {
            return '[object AbortSignal]';
        }
        dispatchEvent(event: Event) {
            if (event.type === 'abort') {
                this.aborted = true;
                if (typeof this.onabort === 'function') {
                    this.onabort.call(this, event);
                }
            }
            return super.dispatchEvent(event);
        }
        throwIfAborted() {
            const { aborted, reason = 'Aborted' } = this;
            if (!aborted) return;
            throw reason;
        }
        static timeout(time: number) {
            const controller = new AbortController();
            setTimeout(() => controller.abort(new DOMException(`This signal is timeout in ${time}ms`, 'TimeoutError')), time);
            return controller.signal;
        }
    }
    class AbortController {
        signal: AbortSignal = new AbortSignal()
        constructor() {
        }
        abort(reason: any) {
            let signalReason = reason;
            if(reason==undefined){
                signalReason=new Error('This operation was aborted');
                signalReason.name='AbortError'
            }
            const event = new Event('abort');
            (event as any).reason = reason;
    
            this.signal.reason = signalReason;
            this.signal.dispatchEvent(event);
        }
        toString() {
            return '[object AbortController]';
        }
    }
    if(globalThis.AbortSignal==undefined || globalThis.AbortSignal.prototype.throwIfAborted==undefined){
        (globalThis as any).AbortController=AbortController;
        (globalThis as any).AbortSignal=AbortSignal;
    }
})();

interface TaskCallback<T>{
    then(resolve:(result:T)=>void,reject:(reason:any)=>void):void
}

export class Task<T> {
    static currentTask: Task<any> | null = null;
    static locals() {
        return Task.currentTask?.locals();
    }
    static getAbortSignal() {
        return Task.currentTask?.getAbortSignal();
    }
    static fork<T2>(taskMain: Generator<TaskCallback<any>, T2, any> | (() => Generator<TaskCallback<any>, T2, any>)){
        if(Task.currentTask!=undefined){
            return Task.currentTask.fork(taskMain);
        }else{
            return new Task(taskMain);
        }
    }
    /*
        Convert Promise to Generator. To use Promise in Task and make correct return type with typescript.
        eg: let number_1=yield* Task.yieldWrap(new Promise((resolve)=>resolve(1)));
    */
    static *yieldWrap<T2>(p: Promise<T2>) {
        return (yield p) as T2;
    }
    constructor(taskMain: Generator<TaskCallback<any>, T, any> | (() => Generator<TaskCallback<any>, T, any>),
        public name?: string) {
        this.__iter = (typeof taskMain === 'function') ? taskMain() : taskMain;
        let resolver: Partial<typeof this.__resolver> = [undefined, undefined, undefined];
        resolver[0] = new Promise((resolve, reject) => {
            resolver![1] = resolve;
            resolver![2] = reject;
        });
        this.__resolver = resolver as any;
        this.__abortController.signal.addEventListener('abort', (ev) => {
            this.onAbort();
        });
    }
    __resolver?: [Promise<T>, ((value: T) => void), ((reason?: any) => void)]
    __iter?: Generator<TaskCallback<any>>;
    __locals = {};
    __abortController = new AbortController();
    __step(tNext: any, error: any) {
        let savedTask=Task.currentTask
        Task.currentTask = this;
        try {
            if (this.__abortController.signal.aborted) {
                this.__iter!.throw(this.__abortController.signal.reason);
            }
            if (error != undefined) {
                this.__iter!.throw(error);
            }
            let yieldResult = this.__iter!.next(tNext);
            if (!yieldResult.done) {
                yieldResult.value.then(
                    r => this.__step(r, undefined),
                    reason => this.__step(undefined, reason)
                );
            } else {
                Task.currentTask = null;
                this.__resolver![1](yieldResult.value);
            }
        } catch (e) {
            this.__resolver![2](e);
        } finally {
            Task.currentTask = savedTask;
        }
    }
    run() {
        this.__step(undefined, undefined);
        return this;
    }
    abort(reason?: any) {
        this.__abortController.abort(reason);
    }
    getAbortSignal() {
        return this.__abortController.signal;
    }
    locals(): Record<string, any> {
        return this.__locals;
    }
    __childrenTask = new Array<Task<any>>();
    //Fork a child task. 
    //The default behaviour: set the parent locals as prototype of child locals, propagate abort signal to children.
    fork<T2>(taskMain: Generator<TaskCallback<any>, T2, any> | (() => Generator<TaskCallback<any>, T2, any>)) {
        let childTask = new Task(taskMain);
        Object.setPrototypeOf(childTask.__locals, this.locals());
        this.__childrenTask.push(childTask);
        const cleanTask = () => this.__childrenTask.splice(this.__childrenTask.indexOf(childTask));
        childTask.then(cleanTask, cleanTask);
        return childTask;
    }
    onAbort() {
        for (let t1 of [...this.__childrenTask]) {
            t1.abort(this.__abortController.signal.reason);
        }
    }
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2> {
        return this.__resolver![0].then(onfulfilled, onrejected);
    }
}

export function throwIfAbortError(e:Error){
    if(e.name==='AbortError'){
        throw e;
    }
}