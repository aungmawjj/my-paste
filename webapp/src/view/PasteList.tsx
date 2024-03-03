import { Box, Show, Icon, IconButton, Text } from "@chakra-ui/react";
import { MdAdd } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useStream } from "../model/stream";
import PasteItem from "./PasteItem";

function PasteList() {
  const { streamEvents, isFirstDevice, addPasteText, deletePastes } = useStream();
  const navigate = useNavigate();

  return !addPasteText ? (
    <Box pt={32}>
      {isFirstDevice ? (
        <Text fontSize="lg" textAlign="center">
          Setting up...
        </Text>
      ) : (
        <Text fontSize="lg" textAlign="center">
          New device request is sent!
          <br />
          Allow from your existing device.
        </Text>
      )}
    </Box>
  ) : (
    <>
      <Show below="md">
        <IconButton
          position="fixed"
          bottom={8}
          right={8}
          zIndex={2}
          aria-label="Add"
          colorScheme="brand"
          width="64px"
          height="64px"
          borderRadius="16px"
          boxShadow="xl"
          icon={<Icon as={MdAdd} boxSize={8} />}
          onClick={() => navigate("/add-paste")}
        />
      </Show>

      <Box pt={6} pb={28} data-testid="paste-list">
        {streamEvents.map((e) => {
          console.log(e.Kind, e.Timestamp, e.Payload);
          switch (e.Kind) {
            case "PasteText":
              return <PasteItem paste={e} onDelete={deletePastes} key={e.Id} />;
          }
        })}
      </Box>
    </>
  );
}

export default PasteList;
