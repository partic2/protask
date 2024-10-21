

export class Task<T>{
    static currentTask:Task<any>|null=null;
    static locals(){
        return Task.currentTask?.locals();
    }
    static getAbortSignal(){
        return Task.currentTask?.getAbortSignal();
    }
    static *yieldWrap<T2>(p:Promise<T2>){
        return (yield p) as T2;
    }
    constructor(taskMain:Generator<Promise<any>,T,any>|(()=>Generator<Promise<any>,T,any>),
                public name?:string){
        this.__iter=(typeof taskMain==='function')?taskMain():taskMain;
        let resolver:Partial<typeof this.__resolver>=[undefined,undefined,undefined];
        resolver[0]=new Promise((resolve,reject)=>{
            resolver![1]=resolve;
            resolver![2]=reject;
        });
        this.__resolver=resolver as any;
    }
    __resolver?:[Promise<T>,((value: T) => void),((reason?: any) => void)]
    __iter?:Generator<Promise<any>>;
    __locals={};
    __abortController=new AbortController();
    __step(tNext:any,error:any){
        Task.currentTask=this;
        try{
            if(this.__abortController.signal.aborted){
                this.__iter!.throw(this.__abortController.signal.reason);
            }
            if(error!=undefined){
                this.__iter!.throw(error);
            }
            let yieldResult=this.__iter!.next(tNext);
            if(!yieldResult.done){
                yieldResult.value.then(
                    r=>this.__step(r,undefined),
                    reason=>this.__step(undefined,reason)
                );
            }else{
                Task.currentTask=null;
                this.__resolver![1](yieldResult.value);
            }
        }catch(e){
            this.__resolver![2](e);
        }finally{
            Task.currentTask=null;
        }
    }
    run(){
        this.__step(undefined,undefined);
        return this;
    }
    abort(reason?:any){
        this.__abortController.abort(reason??new Error('aborted'));
    }
    getAbortSignal(){
        return this.__abortController.signal;
    }
    locals():Record<string,any>{
        return this.__locals;
    }
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>{
        return this.__resolver![0].then(onfulfilled,onrejected);
    }
}