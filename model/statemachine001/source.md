
## Mermaid

```
stateDiagram-v2
    direction LR
    駐車中 --> 初期状態 : 初期化
    初期状態 --> 駐車中 : 下車
    初期状態 --> 走行中 : 進行
    走行中 --> 初期状態 : 停車
```

```
stateDiagram-v2
    direction LR
    Parked --> InitialState : Initialize
    InitialState --> Parked : Get Out
    InitialState --> Driving : Proceed
    Driving --> InitialState : Stop
```

## PlantUML

```
@startuml
left to right direction

state "駐車中" as Parked
state "初期状態" as InitialState
state "走行中" as Driving

Parked --> InitialState : 初期化
InitialState --> Parked : 下車
InitialState --> Driving : 進行
Driving --> InitialState : 停車

@enduml
```

```
@startuml
left to right direction

state "Parked" as Parked
state "InitialState" as InitialState
state "Driving" as Driving

Parked --> InitialState : Initialize
InitialState --> Parked : Get Out
InitialState --> Driving : Proceed
Driving --> InitialState : Stop

@enduml
```