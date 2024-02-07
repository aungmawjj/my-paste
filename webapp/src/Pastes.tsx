import { useCallback, useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Box,
  Icon,
  IconButton,
  Textarea,
  Text,
  useDisclosure,
  Modal,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  ModalOverlay,
  ModalContent,
  Button,
} from "@chakra-ui/react";
import { MdAdd, MdContentCopy, MdSave } from "react-icons/md";

type Event = {
  Id: string;
  Payload: string;
  Timestamp: number;
};

function Pastes() {
  const [pastes, setPastes] = useState<Event[]>([]);

  const fetchEvents = useCallback((ctrl: AbortController, lastId: string) => {
    return axios
      .get<Event[]>("/api/event", {
        signal: ctrl.signal,
        params: { lastId: lastId },
      })
      .then((resp) => {
        setPastes((old) => [...resp.data.reverse(), ...old]);
        return resp.data[0].Id;
      });
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    let loop = true;
    let lastId = "";
    const fetchLoop = async () => {
      while (loop) {
        try {
          lastId = await fetchEvents(ctrl, lastId);
        } catch (err) {
          console.log(err);
        }
      }
    };
    fetchLoop().catch(console.error);
    return () => {
      loop = false;
      ctrl.abort();
    };
  }, [fetchEvents]);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [payload, setPayload] = useState("");
  const textRef = useRef(null);

  const onCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(console.error);
  }, []);

  const onSave = useCallback(
    (payload: string) => {
      axios.post("/api/event", { Payload: payload }).catch(console.error);
      payload = "";
      onClose();
    },
    [onClose]
  );

  return (
    <>
      <IconButton
        position="fixed"
        bottom={6}
        right={6}
        zIndex={2}
        aria-label="Add"
        color="white"
        bg="gray.700"
        width="80px"
        height="64px"
        borderRadius="24px"
        boxShadow="xl"
        icon={<Icon as={MdAdd} boxSize={8} />}
        onClick={onOpen}
      />
      <Modal
        initialFocusRef={textRef}
        size="full"
        isOpen={isOpen}
        onClose={onClose}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Paste Here!</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Textarea
              placeholder="Enter Text"
              size="md"
              rows={5}
              ref={textRef}
              onChange={(e) => setPayload(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              size="md"
              color="white"
              bgColor="gray.700"
              onClick={() => onSave(payload)}
              leftIcon={<Icon as={MdSave} boxSize={6} />}
              isDisabled={payload == ""}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Box pb={20}>
        {pastes.map((p) => (
          <Box
            position="relative"
            key={p.Id}
            py={6}
            px={8}
            m={4}
            border="1px"
            borderColor="gray.100"
            borderRadius="2xl"
          >
            <Text fontSize="xs" color="gray">
              {new Date(p.Timestamp * 1000).toLocaleString()}
            </Text>

            <Text pt={2} fontSize="sm">
              {p.Payload}
            </Text>

            <IconButton
              position="absolute"
              top={1}
              right={3}
              aria-label="copy"
              variant="ghost"
              size="lg"
              onClick={() => onCopy(p.Payload)}
              icon={<Icon color="gray.700" as={MdContentCopy} boxSize={6} />}
            />
          </Box>
        ))}
      </Box>
    </>
  );
}

export default Pastes;
