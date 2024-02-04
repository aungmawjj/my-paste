import { useCallback, useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Flex,
  Icon,
  IconButton,
  Textarea,
  Text,
  Divider,
  Spacer,
} from "@chakra-ui/react";
import { IoSend } from "react-icons/io5";
import { MdContentCopy } from "react-icons/md";

type Event = {
  Id: string;
  Payload: string;
  Timestamp: number;
};

function Pastes() {
  const [pastes, setPastes] = useState<Event[]>([]);
  const [payload, setPayload] = useState("");

  const onSubmit = useCallback((payload: string) => {
    axios.post("/api/event", { Payload: payload }).catch(console.error);
  }, []);

  const fetchEvents = useCallback((ctrl: AbortController, lastId: string) => {
    return axios
      .get<Event[]>("/api/event", {
        signal: ctrl.signal,
        params: { lastId: lastId },
      })
      .then((resp) => {
        setPastes((old) => [...old, ...resp.data].reverse());
        return resp.data[resp.data.length - 1].Id;
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

  const onCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(console.error);
  }, []);

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()}>
        <Flex gap={2} px={10} pb={4} alignItems="flex-end">
          <Textarea
            placeholder="Enter Text"
            size="sm"
            rows={2}
            onChange={(e) => setPayload(e.target.value)}
          />
          <IconButton
            aria-label="Save"
            type="submit"
            size="lg"
            onClick={() => onSubmit(payload)}
            icon={<Icon as={IoSend} boxSize={6} />}
          />
        </Flex>
      </form>

      <Box pb={10}>
        {pastes.map((p) => (
          <Box
            key={p.Id}
            px={6}
            py={3}
            m={4}
            border="1px solid #eee"
            borderRadius={8}
          >
            <Flex alignItems="center">
              <Text fontSize="xs" color="gray">
                {new Date(p.Timestamp * 1000).toLocaleString()}
              </Text>
              <Spacer />
              <IconButton
                aria-label="copy"
                variant="text"
                borderRadius={10}
                size="sm"
                onClick={() => onCopy(p.Payload)}
                icon={<Icon as={MdContentCopy} boxSize={6} />}
              />
            </Flex>
            <Divider my={1} />
            <Text fontSize="sm">{p.Payload}</Text>
          </Box>
        ))}
      </Box>
    </>
  );
}

export default Pastes;
