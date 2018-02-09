---

# spatie/**async**

---

# spatie/**async**

### Asynchronous and parallel processing

---

# spatie/**async**

### Asynchronous and parallel processing

#### In PHP 

---

# 🙈

---

## Parallel processing: **goals**

_Speed up IO and heavy processing, not HTTP requests._

- File parsing
- Image rendering
- Site crawling
- Static site generation

^ Before showing the package and how it's used, I want to quickly look at why you want to do parallel processing.

^ The goal of parallelism to execute long during tasks simultaneously, speeding up the total execution time. And these tasks often involve something more than "just PHP".

^ To name a few examples: parsing of large files, rendering images, crawling a website or a static site generator.

---

## Synchronous execution

===

===

```php
foreach ($tasks as $task) {
    $task->run();
}
```

^ To get familliar with asynchronous, parallel code; this is how synchronous execution of a set of tasks might look: one after the other, and so on.

---

## vs. Parallel execution

===

```php
$pool = Pool::create();

foreach ($tasks as $task) {
    $pool->add($task);
}


$pool->wait();
```

^ With parallel execution, we're using a `Pool` of tasks, and we're going to wait for all tasks in that pool to finish. How exactly the pool handles these tasks is up to the pool itself. Here's a spoiler: it's the pool that's going to spawn child processes to be able to run tasks in parallel.

---

## Comparable packages


- Amp
- ReactPHP
- PHPPM

===

_Trying to create a more intuitive API.
with comparable performance and simple error handling._

^ This is not a new idea, and there are some major PHP packages out there, each having their own way of implementing parallel processing.

^ My personal goal was to create a very intuitive API, with comparable performance, and super clear error handling.

^ So with that out of the way, let's look at how our package works.

---

## Parallel processing: **requirements**

===

- Spawn and manage sub-processes
- Atomic tasks
- Communication between parent and children

===

^ There are a few requirements for parallel processing to work.

^ ...

^ Also...

---

## Parallel processing: **requirements**

===

- Spawn and manage sub-processes
- Atomic tasks
- Communication between parent and children

===

- Windows is a mess

^ Windows is a mess, so no support for it.

---

## spatie/async: **managing processes**

- Process management with `symfony/process`
- Small wrapper around `proc_open`
- Close to UNIX processes

^ To solve the first requirement of process management, we're using the symfony process component to create processes. All of the PHP devs probably know the package, it's a nice OO wrapper around `proc_open` and other process functions.

^ It's also good to mention that these processes spawned from PHP are just plain old UNIX processes, so there's little to no magic in PHP.

---

## spatie/async: **IPC**

- No sockets or `proc_status` polling
- Process signals with `pcntl_async_signals` (PHP 7.1)
- Closure serialisation with `opis/closure`

^ The question about IPC - inter process communication - is a more difficult one. There are several ways to do this, some being more complex than others.

^ The main question to be answered is "is the process done". The easiest and least performant wat is to poll the process every so often. Another approach is to use sockets, but this makes everything much more complex.

^ Ideally you want an asynchronous listener, which signals the parent process when a child is done. Signals exists in UNIX, and PHP has a small wrapper around it. And as of PHP 7.1, you can handle these signals truly asynchronous.

^ Another part of IPC is passing data between processes: input and output. For this we're also using a plain UNIX feature: STDIN and STDOUT. We're using the `opis/closure` package to serialise the data: closures, tasks, etc..

---

## spatie/async: **OO api**

```php
$pool = Pool::create();

foreach ($filePaths as $path) {
    $pool->add(new FileProcessTask($path));
}

$pool->wait();
```

^ After all the theory, it's time to look at the package in practice.

^ This is the OO way of creating tasks and waiting for them to finish.

^ First we create a pool, then add tasks to it, and then wait for all tasks to finish.

--- 

## spatie/async: **functional api**

```php
foreach ($filePaths as $path) {
    $pool[] = async(function () use ($path) {
        $file = file_get_contents($path);
    });
}

await($pool);
```

^ There's also a functional API using `async` and `await` functions, these feel more lightweight in some cases, and are nice buzzwords to throw around :D

---

## spatie/async: **fallback**

- `pcntl` and `posix` extensions required
- Synchronous fallback when parallel execution is not possible

^ As I mentioned before, the way the pool handles tasks is "internal logic". If the required extensions aren't installed on your machine, the pool will automatically fall back on synchronous execution, without having to change the code.

---

## spatie/async: **closures**


```php
$pool->add(function () use ($path) {
    $file = file_get_contents($path);
});
```

^ I already showed a closure passed to the pool in the async/await example. Closures aren't serialisable so that's why we're using the `opis/closure` package to handle this.

---

## spatie/async: **tasks**


```php
class MyTask extends Task
{
    public function configure() { /* ... */ }

    public function run()
    {
        // ...
    }
}

$pool->add(new MyTask());
```

^ Instead of closures, you could also make tasks to encapsulate the logic better, and allow for advanced setup of child processes.

^ `configure` is only ran in the child process.
In case of synchronous fallback, only `run` will be executed.

---

## spatie/async: **simple tasks**


```php
class MyTask
{
    public function __invoke() 
    {
        // ...
    }
}

$pool->add(new MyTask());
```

^ In many cases, full blown tasks are not required. So you can also use invokeable classes which feel more lightweight.

---

## spatie/async: **events**

```php
$pool[] = async(new MyTask())
    
    ->then(function ($output) {})

    ->catch(function ($exception) {})

    ->timeout(function () {})
```

^ We're using simple callbacks to handle a finished task.

^ Promises might be a cooler solution, but they are very complex to implement correctly.

---

## spatie/async: **pool configuration**

```php
$pool = Pool::create()

    ->concurrency(20)

    ->timeout(15)

    ->sleepTime(50000)

    ->autoload(__DIR__ . '/../../vendor/autoload.php')
;
```

^ Autoload is mainly there for local development, because if this package is symlinked, it uses the wrong autoloader.

---

## spatie/async: **atomic tasks**

```php
class MyTask
{
    public function __construct(string $file) 
    {
        $this->file = $file;
    }

    public function __invoke() 
    {
        $this->processFile($file);
    }
}
```

^ This is a bad example, because the whole file is serialised between processes.

---

## spatie/async: **atomic tasks**

```php
class MyTask
{
    public function __construct(string $path) { /* ... */ }

    public function __invoke() {
        $file = file_get_contents($this->path);

        $this->processFile($file);
    }
}
```

^ This is the best approach

---

## spatie/async: **error handling**

```
Error: broken pipe
```

vs

```
Uncaught exception MyException in class MyClass on line 5 
```

- Catch child process errors
- Keep the trace as best as possible

^ The problem with exceptions is that they can't be serialised
You do want to be able to easily debug them though.

---

## Truly asynchronous?

^ To finish off, the question whether this package is truly asynchronous or not. 

^ Parallel processing doesn't necessarily mean asynchronous handling of those processes.

^ `pcntl_async_signals` are, on the level of PHP, truly asynchronous though.

---

# 🎉

---