import { cloneDeep } from "lodash";
import { useEffect, useState } from "react";
import { CHAT_FORM_DIALOG_SUBTITLE } from "../../constants/constants";
import BaseModal from "../../modals/baseModal";
import useAlertStore from "../../stores/alertStore";
import useFlowStore from "../../stores/flowStore";
import { NodeType } from "../../types/flow";
import { validateNodes } from "../../utils/reactflowUtils";
import { cn } from "../../utils/utils";
import AccordionComponent from "../AccordionComponent";
import IOInputField from "../IOInputField";
import IOOutputView from "../IOOutputView";
import IconComponent from "../genericIconComponent";
import NewChatView from "../newChatView";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export default function IOView({ children, open, setOpen }): JSX.Element {
  const inputs = useFlowStore((state) => state.inputs).filter(
    (input) => input.type !== "ChatInput"
  );
  const outputs = useFlowStore((state) => state.outputs).filter(
    (output) => output.type !== "ChatOutput"
  );
  const nodes = useFlowStore((state) => state.nodes).filter(
    (node) =>
      (inputs.some((input) => input.id === node.id) ||
        outputs.some((output) => output.id === node.id)) &&
      node.type !== "ChatInput" &&
      node.type !== "ChatOutput"
  );
  const haveChat =
    useFlowStore((state) => state.outputs).some(
      (output) => output.type === "ChatOutput"
    ) ||
    useFlowStore((state) => state.inputs).some(
      (input) => input.type === "ChatInput"
    );
  const [selectedTab, setSelectedTab] = useState(
    inputs.length > 0 ? 1 : outputs.length > 0 ? 2 : 0
  );
  const [selectedViewField, setSelectedViewField] = useState<
    { type: string; id: string } | undefined
  >(undefined);

  const { getNode, setNode, buildFlow, getFlow } = useFlowStore();
  const { setErrorData } = useAlertStore();
  const setIsBuilding = useFlowStore((state) => state.setIsBuilding);
  const [lockChat, setLockChat] = useState(false);
  const [chatValue, setChatValue] = useState("");
  const isBuilding = useFlowStore((state) => state.isBuilding);

  async function sendMessage(count = 1): Promise<void> {
    if (isBuilding) return;
    const { nodes, edges } = getFlow();
    let nodeValidationErrors = validateNodes(nodes, edges);
    if (nodeValidationErrors.length === 0) {
      setIsBuilding(true);
      setLockChat(true);
      setChatValue("");
      const chatInputId = inputs
        .map((obj) => obj.id)
        .find((inputId) => inputId.includes("ChatInput"));
      const chatInput: NodeType = getNode(chatInputId!) as NodeType;
      if (chatInput) {
        let newNode = cloneDeep(chatInput);
        newNode.data.node!.template["message"].value = chatValue;
        setNode(chatInputId!, newNode);
      }
      for (let i = 0; i < count; i++) {
        await buildFlow().catch((err) => {
          console.error(err);
          setLockChat(false);
        });
      }
      setLockChat(false);

      //set chat message in the flow and run build
      //@ts-ignore
    } else {
      setErrorData({
        title: "Oops! Looks like you missed some required information:",
        list: nodeValidationErrors,
      });
    }
  }

  useEffect(() => {
    setSelectedViewField(undefined);
    setSelectedTab(inputs.length > 0 ? 1 : outputs.length > 0 ? 2 : 0);
  }, [inputs.length, outputs.length]);

  return (
    <BaseModal
      size={haveChat ? "large" : "small"}
      open={open}
      setOpen={setOpen}
    >
      <BaseModal.Trigger>{children}</BaseModal.Trigger>
      {/* TODO ADAPT TO ALL TYPES OF INPUTS AND OUTPUTS */}
      <BaseModal.Header description={CHAT_FORM_DIALOG_SUBTITLE}>
        <div className="flex items-center">
          <span className="pr-2">Chat</span>
          <IconComponent
            name="prompts"
            className="h-6 w-6 pl-1 text-foreground"
            aria-hidden="true"
          />
        </div>
      </BaseModal.Header>
      <BaseModal.Content>
        <div className="flex h-full flex-col">
          <div className="flex-max-width mt-2 h-full">
            {selectedTab !== 0 && (
              <div
                className={cn(
                  "mr-6 flex h-full w-2/6 flex-shrink-0 flex-col justify-start overflow-auto scrollbar-hide",
                  haveChat ? "w-2/6" : "w-full"
                )}
              >
                <Tabs
                  value={selectedTab.toString()}
                  className={
                    "flex h-full flex-col overflow-hidden rounded-md border bg-muted text-center"
                  }
                  onValueChange={(value) => {
                    setSelectedTab(Number(value));
                  }}
                >
                  <div className="api-modal-tablist-div">
                    <TabsList>
                      {inputs.length > 0 && (
                        <TabsTrigger value={"1"}>Inputs</TabsTrigger>
                      )}
                      {outputs.length > 0 && (
                        <TabsTrigger value={"2"}>Outputs</TabsTrigger>
                      )}
                    </TabsList>
                  </div>

                  <TabsContent
                    value={"1"}
                    className="api-modal-tabs-content mt-4"
                  >
                    <div className="mx-2 mb-2 flex items-center gap-2 text-sm font-bold">
                      <IconComponent className="h-4 w-4" name={"Type"} />
                      Text Inputs
                    </div>
                    {nodes
                      .filter((node) =>
                        inputs.some((input) => input.id === node.id)
                      )
                      .map((node, index) => {
                        const input = inputs.find(
                          (input) => input.id === node.id
                        )!;
                        return (
                          <div
                            className="file-component-accordion-div"
                            key={index}
                          >
                            <AccordionComponent
                              trigger={
                                <div className="file-component-badge-div">
                                  <Badge variant="gray" size="md">
                                    {input.id}
                                  </Badge>
                                  {haveChat && (
                                    <div
                                      className="-mb-1 pr-4"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedViewField(input);
                                      }}
                                    >
                                      <IconComponent
                                        className="h-4 w-4"
                                        name="ExternalLink"
                                      ></IconComponent>
                                    </div>
                                  )}
                                </div>
                              }
                              key={index}
                              keyValue={input.id}
                            >
                              <div className="file-component-tab-column">
                                <div className="">
                                  {input && (
                                    <IOInputField
                                      inputType={input.type}
                                      inputId={input.id}
                                    />
                                  )}
                                </div>
                              </div>
                            </AccordionComponent>
                          </div>
                        );
                      })}
                  </TabsContent>
                  <TabsContent
                    value={"2"}
                    className="api-modal-tabs-content mt-4"
                  >
                    <div className="mx-2 mb-2 flex items-center gap-2 text-sm font-bold">
                      <IconComponent className="h-4 w-4" name={"Braces"} />
                      Prompt Outputs
                    </div>
                    {nodes
                      .filter((node) =>
                        outputs.some((output) => output.id === node.id)
                      )
                      .map((node, index) => {
                        const output = outputs.find(
                          (output) => output.id === node.id
                        )!;
                        return (
                          <div
                            className="file-component-accordion-div"
                            key={index}
                          >
                            <AccordionComponent
                              trigger={
                                <div className="file-component-badge-div">
                                  <Badge variant="gray" size="md">
                                    {output.id}
                                  </Badge>
                                  {haveChat && (
                                    <div
                                      className="-mb-1 pr-4"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedViewField(output);
                                      }}
                                    >
                                      <IconComponent
                                        className="h-4 w-4"
                                        name="ExternalLink"
                                      ></IconComponent>
                                    </div>
                                  )}
                                </div>
                              }
                              key={index}
                              keyValue={output.id}
                            >
                              <div className="file-component-tab-column">
                                <div className="">
                                  {output && (
                                    <IOOutputView
                                      outputType={output.type}
                                      outputId={output.id}
                                    />
                                  )}
                                </div>
                              </div>
                            </AccordionComponent>
                          </div>
                        );
                      })}
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {haveChat ? (
              selectedViewField ? (
                inputs.some((input) => input.id === selectedViewField.id) ? (
                  <IOInputField
                    inputType={selectedViewField.type!}
                    inputId={selectedViewField.id!}
                  />
                ) : (
                  <IOOutputView
                    outputType={selectedViewField.type!}
                    outputId={selectedViewField.id!}
                  />
                )
              ) : (
                <NewChatView
                  sendMessage={sendMessage}
                  chatValue={chatValue}
                  setChatValue={setChatValue}
                  lockChat={lockChat}
                  setLockChat={setLockChat}
                />
              )
            ) : (
              <div className="absolute bottom-8 right-8"></div>
            )}
          </div>
          {!haveChat && (
            <div className="flex w-full justify-end pt-6">
              <Button className="px-3" onClick={() => sendMessage(1)}>
                <IconComponent
                  name={isBuilding ? "Loader2" : "Play"}
                  className={cn("h-6 w-6", isBuilding ? "animate-spin" : "")}
                />
              </Button>
            </div>
          )}
        </div>
      </BaseModal.Content>
    </BaseModal>
  );
}
